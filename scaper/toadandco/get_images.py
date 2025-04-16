import json
import time
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from tqdm import tqdm

def scrape_product_details(driver, product_url):
    """
    Scrape product details from a given URL using an existing browser instance.
    Returns a dictionary with name, price, url, and image_urls.
    """
    try:
        # Navigate to the URL
        driver.get(product_url)
        
        # Wait for critical elements to be present
        try:
            # Wait for product title to be visible (max 10 seconds)
            WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1.product__title'))
            )
            
            # Wait for price element
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'span.product__price--regular.flex'))
            )
            
            # Wait for media slider to load
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div.product-single__media-slider'))
            )
        except Exception:
            pass
        
        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Extract product name
        name_element = soup.select_one('h1.product__title')
        name = name_element.text.strip() if name_element else "Name not found"
        
        # Extract price
        price_element = soup.select_one('span.product__price--regular.flex')
        price = price_element.text.strip() if price_element else "Price not found"
        
        # Extract image URLs
        image_urls = []
        media_slider = soup.select_one('div.product-single__media-slider')
        
        if media_slider:
            image_links = media_slider.select('a.product-single__media-link')
            
            for link in image_links:
                href = link.get('href')
                
                # Handle URL formatting correctly
                if href:
                    # Remove leading slashes and add https if needed
                    if href.startswith('//'):
                        href = f"https:{href}"
                    elif href.startswith('/'):
                        href = f"https://www.toadandco.com{href}"
                    
                    if href not in image_urls:
                        image_urls.append(href)
        
        # Create product info dictionary
        product_info = {
            "name": name,
            "price": price,
            "url": product_url,
            "image_urls": image_urls,
            "success": True
        }
        
        return product_info
    
    except Exception as e:
        return {
            "name": "Error",
            "price": "Error",
            "url": product_url,
            "image_urls": [],
            "error": str(e),
            "success": False
        }

def read_links_from_file(file_path):
    """Read links from a text file into a list."""
    try:
        with open(file_path, 'r') as file:
            return [line.strip() for line in file if line.strip()]
    except FileNotFoundError:
        return []

def main(test_mode=True):
    """
    Main function to scrape product details.
    If test_mode is True, only process the first 10 links in total.
    """
    # File paths
    men_links_file = 'toadandco_product_links_men.txt'
    women_links_file = 'toadandco_product_links_women.txt'
    
    # Read links from files
    men_links = read_links_from_file(men_links_file)
    women_links = read_links_from_file(women_links_file)
    
    # Combine all links with category info
    all_links = []
    
    for url in men_links:
        all_links.append({"url": url, "category": "men"})
    
    for url in women_links:
        all_links.append({"url": url, "category": "women"})
    
    # Limit to first 10 links if in test mode
    if test_mode:
        all_links = all_links[:10]
    
    # Set up Chrome options - ONCE for all products
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Run in headless mode
    
    # Initialize browser - ONCE for all products
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # Initialize counters
    successful_scrapes = 0
    failed_scrapes = 0
    
    try:
        # Scrape product details with tqdm progress bar
        product_data = []
        
        for link_info in tqdm(all_links, desc="Scraping products", unit="product"):
            product_info = scrape_product_details(driver, link_info['url'])
            product_info["category"] = link_info["category"]
            
            product_data.append(product_info)
            
            # Update counters
            if product_info.get("success", False):
                successful_scrapes += 1
            else:
                failed_scrapes += 1
            
            # Small delay between requests to be nice to the server
            time.sleep(0.5)
        
        # Save to JSON file
        output_file = 'toadandco_products_test.json' if test_mode else 'toadandco_products_full.json'
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(product_data, f, ensure_ascii=False, indent=2)
        
        # Final stats summary
        print(f"\nScraping complete:")
        print(f"  Total products: {len(all_links)}")
        print(f"  Successful: {successful_scrapes}")
        print(f"  Failed: {failed_scrapes}")
        print(f"  Success rate: {successful_scrapes/len(all_links)*100:.1f}%")
        print(f"  Results saved to: {output_file}")
    
    finally:
        # Make sure to close the browser - ONCE at the end
        driver.quit()

if __name__ == '__main__':
    # Run in test mode first (only 10 links)
    # main(test_mode=True)
    
    # After verifying it works, you can run it for all links by uncommenting the following line:
    main(test_mode=False)