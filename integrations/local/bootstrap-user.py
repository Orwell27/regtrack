"""Dedicated non-admin, API-only identity. stdout contains a secret: redirect to a private file."""
import json

from aleph.core import create_app
from aleph.logic.roles import create_user

app = create_app()
with app.app_context():
    role = create_user("regtrack-local@regtrack.invalid", "RegTrack local verification", None, is_admin=False)
    print(json.dumps({"token": role.api_key, "userId": role.id}))
