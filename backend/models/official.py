"""
Data models for US government officials at all levels.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime


class GovernmentLevel(str, Enum):
    FEDERAL = "federal"
    STATE = "state"
    COUNTY = "county"
    CITY = "city"
    LOCAL = "local"  # township, village, etc.


class Branch(str, Enum):
    LEGISLATIVE = "legislative"
    EXECUTIVE = "executive"
    JUDICIAL = "judicial"


class Party(str, Enum):
    DEMOCRAT = "democrat"
    REPUBLICAN = "republican"
    INDEPENDENT = "independent"
    LIBERTARIAN = "libertarian"
    GREEN = "green"
    OTHER = "other"


class Official(BaseModel):
    """Represents a government official."""
    
    # Core identification
    id: str = Field(description="Unique identifier (e.g., bioguide_id, openstates_id)")
    name: str = Field(description="Full name")
    title: str = Field(description="Official title (e.g., 'U.S. Senator', 'Mayor')")
    level: GovernmentLevel
    branch: Branch
    
    # Geographic representation
    jurisdiction: str = Field(description="Name of jurisdiction (e.g., 'United States', 'Illinois', 'Cook County')")
    district: Optional[str] = Field(None, description="District identifier (e.g., 'IL-07', 'Ward 25')")
    district_name: Optional[str] = Field(None, description="District name (e.g., '7th Congressional District')")
    population: Optional[int] = Field(None, description="Population served")
    
    # Contact information
    official_website: Optional[HttpUrl] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    office_address: Optional[str] = None
    office_city: Optional[str] = None
    office_state: Optional[str] = None
    office_zip: Optional[str] = None
    
    # Political information
    party: Optional[Party] = None
    party_affiliation_percentage: Optional[float] = Field(None, description="Percentage of registered voters in district belonging to official's party")
    voting_record_url: Optional[HttpUrl] = None
    
    # Demographic information (about the district)
    demographics: Optional[Dict[str, Any]] = Field(None, description="Demographic breakdown of district (race, age, income, etc.)")
    
    # Key issues
    key_issues: Optional[List[str]] = Field(None, description="List of key issues/topics associated with official")
    
    # Description/bio
    description: Optional[str] = Field(None, description="Brief biography/description")
    photo_url: Optional[HttpUrl] = None
    
    # Term information
    term_start: Optional[datetime] = None
    term_end: Optional[datetime] = None
    term_length: Optional[int] = Field(None, description="Term length in years")
    
    # Election information
    last_election_date: Optional[datetime] = None
    last_election_result: Optional[float] = Field(None, description="Percentage of vote received")
    next_election_date: Optional[datetime] = None
    
    # Social media
    twitter_handle: Optional[str] = None
    facebook_url: Optional[HttpUrl] = None
    instagram_handle: Optional[str] = None
    linkedin_url: Optional[HttpUrl] = None
    
    # Committee assignments (for legislative)
    committees: Optional[List[str]] = Field(None, description="List of committee assignments")
    
    # Metadata
    source_url: Optional[HttpUrl] = Field(None, description="URL where data was sourced")
    scraped_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)
    
    # Additional fields for flexibility
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional unstructured data")


class FederalLegislator(Official):
    """Federal legislator (Senator or Representative)."""
    
    bioguide_id: Optional[str] = Field(None, description="Congress.gov Bioguide ID")
    lis_id: Optional[str] = Field(None, description="Library of Congress ID")
    govtrack_id: Optional[int] = None
    cspan_id: Optional[int] = None
    votesmart_id: Optional[int] = None
    icpsr_id: Optional[int] = None
    
    chamber: str = Field(description="'senate' or 'house'")
    state: str = Field(description="Two-letter state abbreviation")
    district_number: Optional[int] = Field(None, description="Congressional district number (for House members)")
    
    # Voting statistics
    missed_votes_percentage: Optional[float] = None
    votes_with_party_percentage: Optional[float] = None
    votes_against_party_percentage: Optional[float] = None
    
    # Sponsorships
    bills_sponsored: Optional[int] = None
    bills_cosponsored: Optional[int] = None


class StateLegislator(Official):
    """State legislator."""
    
    openstates_id: Optional[str] = None
    legiscan_id: Optional[int] = None
    
    chamber: str = Field(description="'upper' (senate) or 'lower' (house/assembly)")
    state: str = Field(description="Two-letter state abbreviation")
    district_number: Optional[int] = None


class ExecutiveOfficial(Official):
    """Executive branch official (President, Governor, Mayor, etc.)."""
    
    cabinet_position: Optional[str] = Field(None, description="For federal cabinet members")
    agency: Optional[str] = Field(None, description="Government agency headed")
    appointment_date: Optional[datetime] = None
    appointment_by: Optional[str] = None  # e.g., "President", "Governor"


class JudicialOfficial(Official):
    """Judicial branch official."""
    
    court: str = Field(description="Court name (e.g., 'Supreme Court of the United States')")
    court_level: Optional[str] = Field(None, description="'federal', 'state', 'county', 'city'")
    nomination_date: Optional[datetime] = None
    confirmation_date: Optional[datetime] = None
    confirmation_vote: Optional[str] = None  # Vote tally
    appointed_by: Optional[str] = None  # President/Governor who appointed


# Collection models
class GovernmentDataSet(BaseModel):
    """Container for a collection of officials."""
    
    officials: List[Official]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def to_dataframe(self):
        """Convert to pandas DataFrame (requires pandas)."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for DataFrame conversion")
        
        # Flatten nested structures
        records = []
        for official in self.officials:
            record = official.dict()
            # Handle nested dicts/lists
            record['demographics'] = str(record.get('demographics'))
            record['key_issues'] = ', '.join(record.get('key_issues') or [])
            record['committees'] = ', '.join(record.get('committees') or [])
            records.append(record)
        
        return pd.DataFrame(records)
    
    def to_csv(self, filepath: str):
        """Export to CSV file."""
        df = self.to_dataframe()
        df.to_csv(filepath, index=False)
    
    def to_excel(self, filepath: str, sheet_name: str = "Officials"):
        """Export to Excel file with multiple sheets by level."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for Excel export")
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            # All officials
            self.to_dataframe().to_excel(writer, sheet_name='All', index=False)
            
            # Split by level
            for level in GovernmentLevel:
                level_officials = [o for o in self.officials if o.level == level]
                if level_officials:
                    subset = GovernmentDataSet(officials=level_officials)
                    subset.to_dataframe().to_excel(
                        writer, 
                        sheet_name=level.value.capitalize(), 
                        index=False
                    )
            
            # Split by branch
            for branch in Branch:
                branch_officials = [o for o in self.officials if o.branch == branch]
                if branch_officials:
                    subset = GovernmentDataSet(officials=branch_officials)
                    subset.to_dataframe().to_excel(
                        writer, 
                        sheet_name=branch.value.capitalize(), 
                        index=False
                    )