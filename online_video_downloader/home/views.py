from django.views.generic import TemplateView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from pytube import YouTube
import os
from django.conf import settings
from django.http import FileResponse
import re
import logging
from urllib.parse import urlparse, parse_qs
from urllib.error import HTTPError
from pytube.exceptions import RegexMatchError

logger = logging.getLogger(__name__)

class HomePageView(TemplateView):
    template_name = 'home.html'

class SupportedPlatformsView(APIView):
    def get(self, request):
        platforms = [
            {'name': 'YouTube', 'icon': 'fab fa-youtube'},
            {'name': 'Instagram', 'icon': 'fab fa-instagram'},
            {'name': 'Facebook', 'icon': 'fab fa-facebook'},
            {'name': 'X', 'icon': 'fab fa-twitter'},
            {'name': 'Reddit', 'icon': 'fab fa-reddit'},
            {'name': 'TikTok', 'icon': 'fab fa-tiktok'},
        ]
        return Response(platforms)

class VideoInfoView(APIView):
    def post(self, request):
        url = request.data.get('url')
        if not url:
            return Response({'error': 'URL is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            logger.debug(f"Received URL: {url}")
            parsed_url = urlparse(url)
            if 'youtube.com' in parsed_url.netloc or 'youtu.be' in parsed_url.netloc:
                yt = YouTube(url)
                streams = yt.streams.filter(progressive=True)
                
                available_streams = []
                for stream in streams:
                    available_streams.append({
                        'itag': stream.itag,
                        'resolution': stream.resolution,
                        'filesize': stream.filesize,
                        'mime_type': stream.mime_type,
                    })

                video_info = {
                    'title': yt.title,
                    'thumbnail_url': yt.thumbnail_url,
                    'duration': yt.length,
                    'author': yt.author,
                    'streams': available_streams
                }
                return Response(video_info)
            else:
                return Response({'error': 'Unsupported platform'}, status=status.HTTP_400_BAD_REQUEST)
        except RegexMatchError as e:
            logger.error(f"Regex error: {e}", exc_info=True)
            return Response({'error': 'Failed to parse video information. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error processing video info: {e}", exc_info=True)
            return Response({'error': 'An unexpected error occurred. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DownloadVideoView(APIView):
    def post(self, request):
        url = request.data.get('url')
        itag = request.data.get('itag')
        
        if not url or not itag:
            return Response({'error': 'URL and itag are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if 'youtube.com' in url or 'youtu.be' in url:
                yt = YouTube(url)
                video = yt.streams.get_by_itag(itag)
                
                if not video:
                    return Response({'error': 'Selected video quality not found'}, status=status.HTTP_404_NOT_FOUND)

                download_path = os.path.join(settings.MEDIA_ROOT, 'downloads')
                os.makedirs(download_path, exist_ok=True)
                
                file_path = video.download(output_path=download_path)
                file_name = os.path.basename(file_path)
                
                response = FileResponse(open(file_path, 'rb'))
                response['Content-Disposition'] = f'attachment; filename="{file_name}"'
                
                # Clean up the downloaded file after sending
                os.remove(file_path)
                return response
            else:
                return Response({'error': 'Unsupported platform'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
