/**
 * YouTube Transcript Service
 * Extracts transcripts from YouTube videos using multiple methods
 */

const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');
const fallbackService = require('./youtube-service-fallback');

class YouTubeService {
  constructor() {
    this.baseURL = 'https://www.youtube.com';
  }

  /**
   * Extract video ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string|null} - Video ID or null if invalid
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
   * Get video metadata (title, duration, etc.)
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} - Video metadata
   */
  async getVideoMetadata(videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await axios.get(oembedUrl);
      
      return {
        title: response.data.title,
        author: response.data.author_name,
        thumbnail: response.data.thumbnail_url,
        duration: response.data.duration || null
      };
    } catch (error) {
      console.warn('Could not fetch video metadata:', error.message);
      return {
        title: `Video ${videoId}`,
        author: 'Unknown',
        thumbnail: null,
        duration: null
      };
    }
  }

  /**
   * Get transcript from YouTube video
   * @param {string} url - YouTube URL
   * @param {string} language - Language preference (optional)
   * @returns {Promise<Object>} - Transcript result
   */
  async getTranscript(url, language = null) {
    console.log('Attempting YouTube transcript extraction for:', url);

    // Method 1: Try original youtube-transcript library
    try {
      const videoId = this.extractVideoId(url);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL provided');
      }

      console.log('Extracting transcript for video:', videoId);

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoId);

      // Get transcript using YoutubeTranscript library
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: language || 'en'
      });

      // Format transcript
      const fullText = transcriptData.map(item => item.text).join(' ');
      const segments = transcriptData.map(item => ({
        text: item.text,
        start: item.offset,
        duration: item.duration
      }));

      return {
        success: true,
        transcript: fullText,
        segments: segments,
        service: 'youtube',
        videoId: videoId,
        metadata: metadata,
        language: language || 'en'
      };

    } catch (error) {
      console.error('youtube-transcript library failed:', error.message);
      
      // Method 2: Use fallback service
      console.log('Trying fallback service...');
      const fallbackResult = await fallbackService.getTranscript(url, { language: language || 'en' });
      
      if (fallbackResult.success) {
        return fallbackResult;
      }

      // Return fallback error with suggestions
      return {
        success: false,
        error: 'Unable to extract transcript from this YouTube video. The video may not have captions available, or they may be disabled.',
        service: 'youtube',
        suggestions: [
          'Try a different YouTube video',
          'Check if the video has closed captions enabled',
          'Ensure the video is publicly accessible',
          'Try using a shorter video for testing'
        ]
      };
    }
  }

  /**
   * Get available transcript languages for a video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Array>} - Available languages
   */
  async getAvailableLanguages(videoId) {
    try {
      // This is a simplified implementation
      // In practice, you might need to use YouTube Data API
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Return default language if successful
      return [{
        code: 'en',
        name: 'English',
        available: true
      }];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if video has transcripts available
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} - Availability check result
   */
  async checkTranscriptAvailability(url) {
    try {
      const videoId = this.extractVideoId(url);
      
      if (!videoId) {
        return {
          available: false,
          reason: 'Invalid URL'
        };
      }

      await YoutubeTranscript.fetchTranscript(videoId);
      
      return {
        available: true,
        videoId: videoId
      };
    } catch (error) {
      return {
        available: false,
        reason: error.message
      };
    }
  }

  /**
   * Get transcript with timestamps formatted for SRT
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} - SRT formatted transcript
   */
  async getTranscriptForSRT(url) {
    const result = await this.getTranscript(url);
    
    if (!result.success) {
      return result;
    }

    // Convert to SRT format
    let srtContent = '';
    result.segments.forEach((segment, index) => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.start + segment.duration);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text}\n\n`;
    });

    return {
      ...result,
      srt: srtContent
    };
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }
}

module.exports = new YouTubeService();