from django.urls import path

from . import views

urlpatterns = [
    path("healthz", views.healthz),
    path(".well-known/wikicard-issuer.json", views.issuer_document),
    path("collection/export", views.export_collection),
    path("collection-transfer/authorize/preview", views.preview_authorization),
    path("collection-transfer/authorize", views.authorize),
    path("collection-transfer/token", views.token),
    path("collection-transfer/current", views.current_collection),
    path("collection/import/start", views.start_import),
    path("collection-transfer/callback", views.callback),
    path("linked-collection", views.linked_collection),
    path("integration-complete", views.integration_complete),
]
