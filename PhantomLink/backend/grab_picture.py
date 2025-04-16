import requests
from bs4 import BeautifulSoup

def fetch_image_from_wikipedia(wikipedia_url):
    """
    Fetch the main image URL from the infobox of a Wikipedia page.

    Args:
        wikipedia_url (str): The URL of the Wikipedia page to scrape.

    Returns:
        str: The URL of the image if found, otherwise None.
    """
    try:
        # Send a GET request to the Wikipedia page
        response = requests.get(wikipedia_url)
        response.raise_for_status()  # Raise an exception for HTTP errors

        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the infobox element
        infobox = soup.find('table', class_='infobox')
        if not infobox:
            print("No infobox found on the page.")
            return None

        # Find the image within the infobox
        image_tag = infobox.find('img')
        if not image_tag:
            print("No image found in the infobox.")
            return None

        # Construct the full image URL
        image_url = f"https:{image_tag['src']}"
        return image_url

    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the page: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None
