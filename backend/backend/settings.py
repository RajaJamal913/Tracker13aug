

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-uw-wlry0li%u55dmiqiyig4u%m*pt%a_tve$!pj1)txhf1li$f'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []

CORS_ALLOW_CREDENTIALS = True
# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'accounts',
    'timesheet',
     'rest_framework',
      "rest_framework.authtoken",
    'rest_framework_simplejwt',
    'corsheaders',
    'projects',
     "tasks.apps.TasksConfig",   
    'realtimemonitoring',
    'tracker',
    'leave',
    'shifts',
    'twofactor',
    'reports',
    'task_api',
    'chat',
    'channels'
 
]
import os 
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
AUTH_USER_MODEL = "accounts.User"


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://localhost:3006",
    "http://localhost:3007",
    "http://localhost:3008",
    "http://localhost:3009",
    "http://localhost:3010",
    "http://localhost:3011",
    "http://localhost:3012",
    "http://localhost:3013",
    "http://localhost:3014",
    "http://localhost:3015",
]
MIDDLEWARE = [
    
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    

]
ASGI_APPLICATION = "backend.asgi.application"   # adjust if your project name is different

CHANNEL_LAYERS = {
  "default": {
    "BACKEND": "channels.layers.InMemoryChannelLayer"
    # For production, use Redis:
    # "BACKEND": "channels_redis.core.RedisChannelLayer",
    # "CONFIG": {"hosts": [("127.0.0.1", 6379)]},
  }
}

SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

import os

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True



# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")   # files saved here

STATIC_URL = 'static/'
# allow same-origin embedding
X_FRAME_OPTIONS = 'SAMEORIGIN'


# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
# settings.py

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
}


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "m.jamalraja436@gmail.com"
EMAIL_HOST_PASSWORD = "tbfz zlui uzbg fbnf"
DEFAULT_FROM_EMAIL = "no-reply@yourdomain.com"
# settings.py
# settings.py
# Add your server-side OpenAI key and preferred model
OPENAI_API_KEY ="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"
OPENAI_MODEL = "gpt-4o-mini"     # change to model you have access to
OPENAI_MAX_CANDIDATES = 100      # limit number of candidates sent to the model
OPENAI_MAX_TOKENS = 800
# settings.py (add)
DEVELOPER_TYPE_BOOST = 1.35  # multiply dev-type contribution by this factor when matched
OPENAI_MAX_CANDIDATES = 200
OPENAI_MAX_TOKENS = 800
OPENAI_MODEL = getattr(globals(), "OPENAI_MODEL", "gpt-4o-mini")

