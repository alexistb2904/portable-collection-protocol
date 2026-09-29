from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

if os.getenv("ENVIRONMENT") == "production":
    raise RuntimeError("Replace the Django demo authentication adapter before production.")

SECRET_KEY = "development-only-portable-collection-example"
DEBUG = True
ALLOWED_HOSTS = ["*"]
ROOT_URLCONF = "example_project.urls"
INSTALLED_APPS = ["protocol_app"]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
