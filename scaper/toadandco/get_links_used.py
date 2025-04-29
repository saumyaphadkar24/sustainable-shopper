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

def scrape_links_from_page(driver, url):
    """
    Scrape product links from a specific page according to the specified class structure
    """
    try:
        # Navigate to the URL
        driver.get(url)
        
        # Wait for the content to load - wait for the container div
        # WebDriverWait(driver, 10).until(
        #     EC.presence_of_element_located((By.CSS_SELECTOR, 'div.relative'))
        # )
        time.sleep(5)
        # Get page source and parse with BeautifulSoup
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        # Find all the item divs within the container
        item_links = soup.find_all('a')
        links = []
        for a_tag in item_links:
            if 'href' in a_tag.attrs:
                href = a_tag['href']
                if href.startswith('/product'):
                    href = f"https://toadagain.toadandco.com{href}"
                    links.append(href) 
        print(f'\nFound a total of {len(item_links)} and number of product links is {len(links)}')  
        return links
    
    except Exception as e:
        print(f"Error scraping page {url}: {e}")
        return []

def main():
    """
    Main function to scrape product links from all pages
    """
    # Set up Chrome options
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Run in headless mode
    
    # Initialize browser
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # Base URL for the first page
    base_url = "https://toadagain.toadandco.com/shop"
    
    # URL template for other pages
    page_url_template = "https://toadagain.toadandco.com/shop?productFilters=%7B%22Page%22%3A{page_number}%7D"
    
    # Number of pages to scrape
    total_pages = 20
    
    # List to store all unique links
    all_links = []
    
    
        # Scrape links from all pages
    for page_num in tqdm(range(1, total_pages + 1), desc="Scraping pages", unit="page"):
        # Determine the URL for this page
        if page_num == 1:
            url = base_url
        else:
            url = page_url_template.format(page_number=page_num)
        
        # Scrape links from this page
        page_links = scrape_links_from_page(driver, url)
        
        # Add new links to the list
        for link in page_links:
            if link not in all_links:
                all_links.append(link)
        
        # Small delay between requests to be nice to the server
        time.sleep(1)
        
    # Save links to a text file
    output_file = 'toadagain_product_links_used.txt'
    with open(output_file, 'w') as f:
        for link in all_links:
            f.write(f"{link}\n")
        
        # Summary
        print(f"\nScraping complete:")
        print(f"  Total pages scraped: {total_pages}")
        print(f"  Total unique links found: {len(all_links)}")
        print(f"  Links saved to: {output_file}")
    
    # finally:
    #     # Make sure to close the browser
    #     driver.quit()

if __name__ == '__main__':
    main()