from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from tqdm import tqdm
import time
import json
import re

def extract_product_details(driver, url):
    """
    Extract product details from a product page
    """
    try:
        # Navigate to URL
        driver.get(url)
        
        # Wait for the content to load - wait for div with class "mr-6"
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div.mr-6'))
        )
        
        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Find div with class "mr-6"
        image_container = soup.select_one('div.mr-6')
        
        # Extract image URLs
        image_urls = set()
        if image_container:
            # Find divs with the specified class for images
            image_divs = image_container.select('div.cursor-pointer.bg-cover.bg-center.mb-4')
            
            for div in image_divs:
                # Extract URL from the background-image style
                style = div.get('style', '')
                url_match = re.search(r'url\("([^"]+)"\)', style)
                if url_match:
                    image_url = url_match.group(1)
                    image_urls.add(image_url)
        
        # Find product name
        name_element = soup.select_one('h3.MuiTypography-root.MuiTypography-h3')
        product_name = name_element.text.strip() if name_element else "Name not found"
        
        # Find product price
        price_element = soup.select_one('p.MuiTypography-root.font-bold.mr-2.MuiTypography-body1')
        product_price = price_element.text.strip() if price_element else "Price not found"
        
        # Return product details
        return {
            "name": product_name,
            "price": product_price,
            "url": url,
            "image_urls": list(image_urls),
            "success": True
        }
    
    except Exception as e:
        return {
            "name": "Error",
            "price": "Error",
            "url": url,
            "image_urls": [],
            "error": str(e),
            "success": False
        }

def needs_retry(product_info):
    """
    Check if a product needs to be retried based on error status or missing data
    """
    if not product_info.get("success", False):
        return True
    
    if product_info.get("name") in ["Error", "Name not found"]:
        return True
    
    if product_info.get("price") in ["Error", "Price not found"]:
        return True
    
    if not product_info.get("image_urls", []):
        return True
    
    return False

def main():
    """
    Main function to process product links and extract details
    """
    # File with product links
    links_file = 'scaper\\toadandco\\toadagain_product_links_used.txt'
    
    # Read links from file
    try:
        with open(links_file, 'r') as file:
            product_links = [line.strip() for line in file if line.strip()]
    except FileNotFoundError:
        print(f"Error: File '{links_file}' not found.")
        return
    
    print(f"Read {len(product_links)} links from file.")
    
    # Set up Chrome options
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Run in headless mode
    
    # Initialize browser
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # Initialize counters
    successful_scrapes = 0
    failed_scrapes = 0
    
    # List to store product details
    product_data = []
    
    try:
        # Initial scraping pass
        print("Initial scraping pass...")
        i = 0
        for link in tqdm(product_links, desc="Scraping products", unit="product"):
            # Extract product details
            product_info = extract_product_details(driver, link)
            
            # Add to product data
            product_data.append(product_info)
            
            # Update counters
            if product_info.get("success", False) and not needs_retry(product_info):
                successful_scrapes += 1
            else:
                failed_scrapes += 1
            
            # Small delay between requests
            time.sleep(0.5)
            i+=1
            if i==5:
                break
        
        # Retry products with errors or missing information
        print("\nRetrying products with errors or missing information...")
        retry_count = 0
        successful_retries = 0
        
        # Find products that need retrying
        retry_indices = [i for i, product in enumerate(product_data) if needs_retry(product)]
        
        if retry_indices:
            # Use different wait times for retry
            retry_delays = [2, 3, 5]  # Different delays in seconds to try
            
            for delay in retry_delays:
                if not retry_indices:
                    break  # No more products to retry
                
                print(f"\nRetry attempt with {delay} second wait time...")
                still_failed = []
                
                for idx in tqdm(retry_indices, desc=f"Retrying products (wait={delay}s)", unit="product"):
                    retry_count += 1
                    product_url = product_data[idx]["url"]
                    
                    # Clean up cache
                    driver.execute_script('window.localStorage.clear();')
                    driver.execute_script('window.sessionStorage.clear();')
                    driver.delete_all_cookies()
                    
                    # Navigate to URL with longer wait time
                    driver.get(product_url)
                    time.sleep(delay)  # Use longer wait time
                    
                    # Try to extract details again
                    retry_info = extract_product_details(driver, product_url)
                    
                    # Check if retry was successful
                    if not needs_retry(retry_info):
                        # Update product data with successful retry
                        product_data[idx] = retry_info
                        successful_retries += 1
                        successful_scrapes += 1
                        failed_scrapes -= 1
                    else:
                        # Still failed
                        still_failed.append(idx)
                
                # Update retry_indices for next delay attempt
                retry_indices = still_failed
        print(product_data)
        # Save to JSON file
        output_file = 'scaper\\toadandco\\toadagain_products.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(product_data, f, ensure_ascii=False, indent=2)
        
        # Summary
        print(f"\nScraping complete:")
        print(f"  Total products: {len(product_links)}")
        print(f"  Initial failed products: {failed_scrapes + successful_retries}")
        print(f"  Retry attempts: {retry_count}")
        print(f"  Successful retries: {successful_retries}")
        print(f"  Final successful: {successful_scrapes}")
        print(f"  Final failed: {failed_scrapes}")
        print(f"  Final success rate: {successful_scrapes/len(product_links)*100:.1f}%")
        print(f"  Results saved to: {output_file}")
    
    finally:
        # Make sure to close the browser
        driver.quit()

if __name__ == '__main__':
    main()