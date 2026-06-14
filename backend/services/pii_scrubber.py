import re

def scrub_pii(text: str) -> str:
    """
    Scrub PII (SSNs, Credit Cards, Emails) from text before sending to LLM.
    """
    if not text:
        return text
        
    # SSN: ###-##-####
    ssn_pattern = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
    text = ssn_pattern.sub('[REDACTED_SSN]', text)
    
    # Credit Card: 16 digits, with optional spaces or dashes
    cc_pattern = re.compile(r'\b(?:\d[ -]*?){13,16}\b')
    text = cc_pattern.sub('[REDACTED_CC]', text)
    
    # Email addresses
    email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    text = email_pattern.sub('[REDACTED_EMAIL]', text)
    
    return text
