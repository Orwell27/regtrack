# /// script
# requires-python = ">=3.12"
# dependencies = ["followthemoney==4.11.0"]
# ///
"""Real-library positive/negative checks; no external services or model calls."""
from validate import validate

valid = [
    {"id": "company-demo", "schema": "Company", "properties": {"name": ["Empresa ficticia"], "jurisdiction": ["es"]}},
    {"id": "person-demo", "schema": "Person", "properties": {"name": ["Persona ficticia"]}},
    {"id": "ownership-demo", "schema": "Ownership", "properties": {"owner": ["person-demo"], "asset": ["company-demo"], "percentage": ["25"]}},
]
for entity in valid:
    validate(entity)
for invalid in [
    {"id": "bad", "schema": "Company", "properties": {"name": ["X"], "invented": ["x"]}},
    {"id": "bad", "schema": "NotASchema", "properties": {}},
    {"id": "bad", "schema": "Person", "properties": {"name": "not an array"}},
    {"id": "bad", "schema": "Document", "properties": {"title": ["no fileName"]}},
]:
    try:
        validate(invalid)
    except (ValueError, TypeError):
        pass
    else:
        raise AssertionError("Validator accepted invalid data")
print("FtM: 3 valid entities/relationship; 4 invalid inputs rejected")
