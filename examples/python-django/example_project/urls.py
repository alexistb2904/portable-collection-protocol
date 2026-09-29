from django.urls import include, path

urlpatterns = [
    path("", include("protocol_app.urls")),
]
