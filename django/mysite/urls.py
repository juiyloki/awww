"""
Root URL configuration for mysite.

Route map:
    admin/          Django admin panel
    (empty)         pages app  (home, about, greet, projects, guestbook, api-demo)
    blog/           blog app   (post list, post detail, category filter, new post)
    accounts/       auth       (allauth + custom register/profile)
    api/            hand-rolled JSON API  (PostListView, PostDetailView, PostCommentView)
    drf/            DRF ModelViewSet API  (auto-generated CRUD via DefaultRouter)
    api/schema/     OpenAPI YAML schema   (drf-spectacular)
    api/swagger/    Swagger UI            (drf-spectacular)
    __debug__/      Django Debug Toolbar  (DEBUG=True only)
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/',       admin.site.urls),
    path('',             include('pages.urls')),
    path('blog/',        include('blog.urls')),
    path('accounts/',    include('accounts.urls')),
    path('api/',         include('blog.api_urls')),
    path('drf/',         include('blog.drf_urls')),
    path('api/schema/',  SpectacularAPIView.as_view(),                          name='schema'),
    path('api/swagger/', SpectacularSwaggerView.as_view(url_name='schema'),     name='swagger-ui'),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
