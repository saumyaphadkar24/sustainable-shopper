from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time

def extract_product_links_from_all_pages(base_url, start_page, end_page):
    print(f'Starting scraper for pages {start_page} to {end_page}')
    
    # Set up Chrome options
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Run in headless mode
    
    # Set up the driver with WebDriver Manager
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # List to store all product links
    all_product_links = []
    
    try:
        # Loop through each page
        for page_num in range(start_page, end_page + 1):
            # Construct the URL for the current page
            if page_num == 1:
                # First page might not need the page parameter
                url = base_url
            else:
                url = f"{base_url}?page={page_num}"
            
            print(f"\nProcessing page {page_num}: {url}")
            
            # Navigate to the URL
            driver.get(url)
            
            # Wait for the page to load
            time.sleep(5)  # Simple wait for page load
            
            # Get page source and parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Find all divs with the class "ss__result__inner"
            result_divs = soup.select('div.ss__result__inner')
            
            print(f'Found {len(result_divs)} product divs on page {page_num}')
            
            # For each div, find the links with class "product__media__holder"
            page_links = []
            for div in result_divs:
                # Find links with class "product__media__holder" within this div
                media_links = div.select('a.product__media__holder')
                
                for link in media_links:
                    # Extract the href attribute
                    href = link.get('href')
                    
                    # Make it an absolute URL if it's relative
                    if href and href.startswith('/'):
                        href = f"https://www.toadandco.com{href}"
                    
                    if href and href not in page_links:
                        page_links.append(href)
            
            print(f'Extracted {len(page_links)} unique product links from page {page_num}')
            all_product_links.extend(page_links)
            
            # Optional: print the links found on this page
            for i, link in enumerate(page_links, 1):
                print(f"  {i}. {link}")
            
            # Small delay between pages to avoid overloading the server
            if page_num < end_page:
                time.sleep(2)
        
        # Remove duplicates
        unique_links = list(set(all_product_links))
        print(f"\nTotal unique product links found: {len(unique_links)}")
        
        # Save to text file
        with open('toadandco_product_links_men.txt', 'w') as file:
            for link in unique_links:
                file.write(f"{link}\n")
        
        print(f"All links saved to 'toadandco_product_links_men.txt'")
        
        return unique_links
        
    finally:
        # Make sure to close the browser
        driver.quit()

if __name__ == '__main__':
    # Base URL for the collection
    base_url = 'https://www.toadandco.com/collections/all-mens-clothing'
    
    # Page range to scrape
    start_page = 1
    end_page = 4
    
    # Extract links from all pages
    all_links = extract_product_links_from_all_pages(base_url, start_page, end_page)