/**
 * Fallback YouTube Transcript Service
 * Uses alternative methods when youtube-transcript fails
 */

const axios = require('axios');

class YouTubeFallbackService {
  constructor() {
    this.baseURL = 'https://www.youtube.com';
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      /youtube\.com\/live\/([^"&?\/\s]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Get transcript using YouTube Data API v3
   */
  async getTranscriptWithAPI(url, apiKey = process.env.YOUTUBE_API_KEY) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Try to get captions using YouTube API
      if (!apiKey) {
        throw new Error('YouTube API key not configured');
      }

      const captionsResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/captions`,
        {
          params: {
            part: 'snippet',
            videoId: videoId,
            key: apiKey
          }
        }
      );

      if (captionsResponse.data.items && captionsResponse.data.items.length > 0) {
        // Get the first available caption track
        const captionId = captionsResponse.data.items[0].id;
        
        const transcriptResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/captions/${captionId}`,
          {
            params: {
              key: apiKey
            }
          }
        );

        return {
          success: true,
          transcript: transcriptResponse.data,
          service: 'youtube-api',
          videoId: videoId
        };
      } else {
        throw new Error('No captions available for this video');
      }

    } catch (error) {
      console.error('YouTube API error:', error.message);
      return {
        success: false,
        error: error.message,
        service: 'youtube-api'
      };
    }
  }

  /**
   * Get basic video info and create placeholder transcript
   */
  async getBasicTranscript(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Get video title and basic info
      const oembedResponse = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      const videoInfo = oembedResponse.data;
      
      // Create a basic transcript placeholder
      return {
        success: true,
        transcript: `Video: ${videoInfo.title}\nAuthor: ${videoInfo.author_name}\n\n[Transcript extraction failed - video may not have captions available or they may be disabled. Please try a different video or check if the video has closed captions enabled.]`,
        segments: [{
          text: `[Video: ${videoInfo.title} by ${videoInfo.author_name}]`,
          start: 0,
          duration: 0
        }],
        service: 'youtube-basic',
        videoId: videoId,
        metadata: {
          title: videoInfo.title,
          author: videoInfo.author_name,
          thumbnail: videoInfo.thumbnail_url
        },
        note: 'This is a placeholder transcript. The video may not have automatic captions available.'
      };

    } catch (error) {
      console.error('Basic YouTube info error:', error.message);
      return {
        success: false,
        error: 'Could not extract basic video information',
        service: 'youtube-basic'
      };
    }
  }

  /**
   * Main transcript function with multiple fallback methods
   */
  async getTranscript(url, options = {}) {
    console.log('Attempting YouTube transcript extraction for:', url);

    // Method 1: Try original youtube-transcript library
    try {
      const { YoutubeTranscript } = require('youtube-transcript');
      const videoId = this.extractVideoId(url);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log('Trying youtube-transcript library for video:', videoId);

      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: options.language || 'en'
      });

      console.log('youtube-transcript returned:', transcriptData.length, 'segments');

      if (transcriptData && transcriptData.length > 0) {
        const fullText = transcriptData.map(item => item.text).join(' ');
        
        return {
          success: true,
          text: fullText,
          segments: transcriptData.map(item => ({
            text: item.text,
            start: item.offset,
            duration: item.duration
          })),
          language: options.language || 'en',
          service: 'youtube',
          videoId: videoId
        };
      } else {
        console.log('youtube-transcript returned empty data');
      }
    } catch (error) {
      console.log('youtube-transcript library failed:', error.message);
    }

    // Method 2: Try YouTube Data API
    try {
      const apiResult = await this.getTranscriptWithAPI(url);
      if (apiResult.success) {
        return apiResult;
      }
    } catch (error) {
      console.log('YouTube API failed:', error.message);
    }

    // Method 3: Fallback to basic info
    try {
      const basicResult = await this.getBasicTranscript(url);
      if (basicResult.success) {
        return basicResult;
      }
    } catch (error) {
      console.log('Basic transcript failed:', error.message);
    }

    // Final fallback - return basic info even if no transcript
    try {
      const videoId = this.extractVideoId(url);
      const metadata = await this.getVideoMetadata(videoId);
      
      return {
        success: true,
        text: `[YouTube Video: ${metadata.title} by ${metadata.author}]\n\nThis video does not have automatic captions available. The video may be too short, too new, or captions may be disabled by the uploader.\n\nTry:\n- A different video with captions enabled\n- A video with automatic YouTube captions\n- Uploading your own audio file for transcription`,
        segments: [{
          text: `[Video: ${metadata.title} by ${metadata.author}]`,
          start: 0,
          duration: 0
        }],
        language: options.language || 'en',
        service: 'youtube-fallback',
        videoId: videoId,
        metadata: metadata,
        note: 'Video information retrieved but no transcript available'
      };
    } catch (error) {
      console.log('Final fallback failed:', error.message);
    }

    return {
      success: false,
      error: 'Unable to extract transcript from this YouTube video. The video may not have captions available, or they may be disabled.',
      service: 'youtube',
      suggestions: [
        'Try a different YouTube video',
        'Check if the video has closed captions enabled',
        'Ensure the video is publicly accessible',
        'Try using a shorter video for testing',
        'Upload your own audio file instead'
      ]
    };
  }
}

module.exports = new YouTubeFallbackService();