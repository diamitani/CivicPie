"""
Scrapy spiders for collecting Chicago civic data from public sources.
"""

import scrapy
from scrapy.crawler import CrawlerProcess
from datetime import datetime
import json

class ChicagoCityCouncilSpider(scrapy.Spider):
    """Spider to scrape Chicago City Council website for alderman information"""
    name = "chicago_city_council"
    
    custom_settings = {
        'USER_AGENT': 'CivicPie Bot (civic engagement platform)',
        'ROBOTSTXT_OBEY': True,
        'DOWNLOAD_DELAY': 1,
    }
    
    def start_requests(self):
        # Chicago City Council aldermanic directory
        urls = [
            'https://www.chicago.gov/city/en/about/wards.html',
        ]
        for url in urls:
            yield scrapy.Request(url=url, callback=self.parse_ward_list)
    
    def parse_ward_list(self, response):
        """Extract ward links from main page"""
        # This is a placeholder - actual selectors would depend on the site structure
        ward_links = response.css('a.ward-link::attr(href)').getall()
        for link in ward_links:
            yield response.follow(link, self.parse_ward_page)
    
    def parse_ward_page(self, response):
        """Extract detailed ward and alderman information"""
        ward_number = response.css('.ward-number::text').get()
        alderman_name = response.css('.alderman-name::text').get()
        
        yield {
            'ward_number': ward_number,
            'alderman_name': alderman_name,
            'office_address': response.css('.office-address::text').get(),
            'phone': response.css('.office-phone::text').get(),
            'email': response.css('.office-email::text').get(),
            'website': response.css('.alderman-website::attr(href)').get(),
            'committees': response.css('.committee::text').getall(),
            'scraped_at': datetime.now().isoformat(),
        }

class AldermanWebsiteSpider(scrapy.Spider):
    """Spider to scrape individual aldermanic websites"""
    name = "alderman_websites"
    
    custom_settings = {
        'USER_AGENT': 'CivicPie Bot (civic engagement platform)',
        'ROBOTSTXT_OBEY': True,
        'DOWNLOAD_DELAY': 2,  # Be respectful to individual sites
    }
    
    def __init__(self, ward_data=None):
        super().__init__()
        self.ward_data = ward_data or []
    
    def start_requests(self):
        for ward in self.ward_data:
            if ward.get('website'):
                yield scrapy.Request(
                    url=ward['website'],
                    callback=self.parse_alderman_site,
                    meta={'ward_number': ward['ward_number']}
                )
    
    def parse_alderman_site(self, response):
        """Extract content from alderman website"""
        ward_number = response.meta['ward_number']
        
        # Look for common page types
        pages_to_scrape = {
            'about': response.css('a[href*="about"]::attr(href)').get(),
            'meetings': response.css('a[href*="meeting"]::attr(href)').get(),
            'news': response.css('a[href*="news"]::attr(href)').get(),
            'contact': response.css('a[href*="contact"]::attr(href)').get(),
            'services': response.css('a[href*="service"]::attr(href)').get(),
        }
        
        yield {
            'ward_number': ward_number,
            'url': response.url,
            'title': response.css('title::text').get(),
            'pages': pages_to_scrape,
            'news_items': self.extract_news(response),
            'meeting_info': self.extract_meetings(response),
            'contact_info': self.extract_contact(response),
            'scraped_at': datetime.now().isoformat(),
        }
        
        # Follow links to other pages
        for page_type, link in pages_to_scrape.items():
            if link:
                yield response.follow(link, self.parse_subpage, meta={'ward_number': ward_number, 'page_type': page_type})
    
    def parse_subpage(self, response):
        """Parse individual pages (about, meetings, news, etc.)"""
        ward_number = response.meta['ward_number']
        page_type = response.meta['page_type']
        
        # Extract main content
        content = ' '.join(response.css('main, .content, article, .entry-content p::text').getall())
        
        yield {
            'ward_number': ward_number,
            'page_type': page_type,
            'url': response.url,
            'title': response.css('h1, .page-title::text').get(),
            'content': content[:5000],  # Limit content length
            'scraped_at': datetime.now().isoformat(),
        }
    
    def extract_news(self, response):
        """Extract news/blog posts from alderman site"""
        news_items = []
        for article in response.css('.news-item, .post, article')[:10]:  # Limit to 10
            news_items.append({
                'title': article.css('h2, h3, .title::text').get(),
                'date': article.css('.date, time::text').get(),
                'summary': article.css('p::text').get(),
                'link': article.css('a::attr(href)').get(),
            })
        return news_items
    
    def extract_meetings(self, response):
        """Extract meeting information"""
        meetings = []
        for meeting in response.css('.meeting, .event')[:10]:
            meetings.append({
                'title': meeting.css('.title, h3::text').get(),
                'date': meeting.css('.date::text').get(),
                'time': meeting.css('.time::text').get(),
                'location': meeting.css('.location::text').get(),
                'description': meeting.css('.description, p::text').get(),
            })
        return meetings
    
    def extract_contact(self, response):
        """Extract contact information"""
        return {
            'address': response.css('.address::text').get(),
            'phone': response.css('.phone::text').get(),
            'email': response.css('.email::text').get(),
            'hours': response.css('.hours::text').get(),
        }

class ChicagoDataPortalSpider(scrapy.Spider):
    """Spider to scrape Chicago Data Portal for ward statistics"""
    name = "chicago_data_portal"
    
    custom_settings = {
        'USER_AGENT': 'CivicPie Bot (civic engagement platform)',
        'ROBOTSTXT_OBEY': True,
    }
    
    def start_requests(self):
        # Chicago Data Portal - would use their API in production
        urls = [
            'https://data.cityofchicago.org/',  # This is the API base
        ]
        for url in urls:
            yield scrapy.Request(url=url, callback=self.parse)
    
    def parse(self, response):
        """Parse Chicago Data Portal"""
        # In production, this would use the Socrata API
        # to get ward-level statistics
        yield {
            'source': 'Chicago Data Portal',
            'scraped_at': datetime.now().isoformat(),
            'note': 'Would integrate with Socrata API for ward statistics',
        }

def run_spiders():
    """Run all spiders"""
    process = CrawlerProcess(settings={
        'FEED_FORMAT': 'json',
        'FEED_URI': 'file:///data/scraped_data.json',
        'LOG_LEVEL': 'INFO',
    })
    
    process.crawl(ChicagoCityCouncilSpider)
    process.crawl(AldermanWebsiteSpider)
    process.crawl(ChicagoDataPortalSpider)
    
    process.start()

if __name__ == '__main__':
    run_spiders()
