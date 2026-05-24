/**
 * Social Share Modal Component
 * Allows sharing achievements and games to social media
 */

import { useState, useEffect } from 'react';
import { socialShareService, type ShareableAchievement, type ShareableGame } from '../services/socialShareService';
import { shareImageService } from '../services/shareImageService';
import { videoReplayService } from '../services/videoReplayService';

interface SocialShareModalProps {
  type: 'achievement' | 'game';
  data: ShareableAchievement | ShareableGame;
  onClose: () => void;
}

export default function SocialShareModal({ type, data, onClose }: SocialShareModalProps) {
  const [shareMessage, setShareMessage] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<Blob | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const shareText = type === 'achievement'
    ? socialShareService.generateAchievementText(data as ShareableAchievement)
    : socialShareService.generateGameText(data as ShareableGame);

  // Generate image on mount
  useEffect(() => {
    const generateImage = async () => {
      setGeneratingImage(true);
      try {
        const imageDataUrl = type === 'achievement'
          ? await shareImageService.generateAchievementImage(data as ShareableAchievement)
          : await shareImageService.generateGameImage(data as ShareableGame);
        setGeneratedImage(imageDataUrl);
      } catch (error) {
        console.error('Error generating image:', error);
      } finally {
        setGeneratingImage(false);
      }
    };
    generateImage();
  }, [type, data]);

  const handleGenerateVideo = async () => {
    if (type !== 'game') return;

    setGeneratingVideo(true);
    setVideoProgress(0);

    try {
      const gameData = data as ShareableGame;

      // Step 1: Generate frames (70% of progress)
      setVideoProgress(10);
      const frames = await videoReplayService.generateReplayFrames(
        gameData.gameRecord,
        gameData.highlights,
        { speed: 'normal', includeHighlights: true }
      );
      setVideoProgress(70);

      // Step 2: Convert to video (30% of progress)
      const videoBlob = await videoReplayService.framesToVideoBlob(frames, 30);
      setVideoProgress(100);

      setGeneratedVideo(videoBlob);
      setShareMessage('✅ Video generado correctamente!');
      setTimeout(() => setShareMessage(''), 3000);
    } catch (error) {
      console.error('Error generating video:', error);
      setShareMessage('❌ Error al generar video');
      setTimeout(() => setShareMessage(''), 3000);
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleDownloadVideo = () => {
    if (generatedVideo) {
      // Detectar formato del video
      const isMP4 = generatedVideo.type === 'video/mp4';
      const extension = isMP4 ? 'mp4' : 'webm';
      const filename = `partida-replay-${Date.now()}.${extension}`;

      videoReplayService.downloadVideo(generatedVideo, filename);
      setShareMessage(`✅ Video descargado en formato ${extension.toUpperCase()}!`);
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  const handleDownloadImage = () => {
    if (generatedImage) {
      const filename = type === 'achievement'
        ? `logro-${(data as ShareableAchievement).achievement.id}.png`
        : `partida-${Date.now()}.png`;
      shareImageService.downloadImage(generatedImage, filename);
      setShareMessage('✅ Imagen descargada!');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  // Separate share handlers for image
  const handleShareImageTwitter = () => {
    if (generatedImage) {
      handleDownloadImage();
      setTimeout(() => {
        socialShareService.shareToTwitter(shareText);
        setShareMessage('✅ Imagen descargada! Adjúntala en Twitter');
      }, 500);
    } else {
      socialShareService.shareToTwitter(shareText);
      setShareMessage('✅ Abriendo Twitter...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareImageDiscord = async () => {
    if (generatedImage) {
      handleDownloadImage();
    }
    const success = await socialShareService.shareToDiscord(shareText);
    if (success) {
      setCopySuccess(true);
      setShareMessage('✅ Imagen descargada y texto copiado! Pégalos en Discord');
      setTimeout(() => {
        setShareMessage('');
        setCopySuccess(false);
      }, 3000);
    } else {
      setShareMessage('❌ Error al copiar');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  const handleShareImageWhatsApp = () => {
    if (generatedImage) {
      handleDownloadImage();
      setTimeout(() => {
        socialShareService.shareToWhatsApp(shareText);
        setShareMessage('✅ Imagen descargada! Adjúntala en WhatsApp');
      }, 500);
    } else {
      socialShareService.shareToWhatsApp(shareText);
      setShareMessage('✅ Abriendo WhatsApp...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareImageFacebook = () => {
    if (generatedImage) {
      handleDownloadImage();
      setTimeout(() => {
        socialShareService.shareToFacebook(shareText);
        setShareMessage('✅ Imagen descargada! Adjúntala en Facebook');
      }, 500);
    } else {
      socialShareService.shareToFacebook(shareText);
      setShareMessage('✅ Abriendo Facebook...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareImageInstagram = () => {
    // Auto-download image first
    if (generatedImage) {
      handleDownloadImage();
      setTimeout(() => {
        socialShareService.shareToInstagram('');
        setShareMessage('✅ Imagen descargada! Adjúntala en Instagram Stories');
      }, 500);
    } else {
      socialShareService.shareToInstagram('');
      setShareMessage('✅ Abriendo Instagram...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareImageTikTok = () => {
    // Auto-download image first
    if (generatedImage) {
      handleDownloadImage();
      setTimeout(() => {
        socialShareService.shareToTikTok('');
        setShareMessage('✅ Imagen descargada! Adjúntala en TikTok');
      }, 500);
    } else {
      socialShareService.shareToTikTok('');
      setShareMessage('✅ Abriendo TikTok...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  // Separate share handlers for video
  const handleShareVideoTwitter = () => {
    if (generatedVideo) {
      handleDownloadVideo();
      setTimeout(() => {
        socialShareService.shareToTwitter(shareText);
        setShareMessage('✅ Video descargado! Adjúntalo en Twitter');
      }, 500);
    } else {
      socialShareService.shareToTwitter(shareText);
      setShareMessage('✅ Abriendo Twitter...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareVideoDiscord = async () => {
    if (generatedVideo) {
      handleDownloadVideo();
    }
    const success = await socialShareService.shareToDiscord(shareText);
    if (success) {
      setCopySuccess(true);
      setShareMessage('✅ Video descargado y texto copiado! Pégalos en Discord');
      setTimeout(() => {
        setShareMessage('');
        setCopySuccess(false);
      }, 3000);
    } else {
      setShareMessage('❌ Error al copiar');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  const handleShareVideoWhatsApp = () => {
    if (generatedVideo) {
      handleDownloadVideo();
      setTimeout(() => {
        socialShareService.shareToWhatsApp(shareText);
        setShareMessage('✅ Video descargado! Adjúntalo en WhatsApp');
      }, 500);
    } else {
      socialShareService.shareToWhatsApp(shareText);
      setShareMessage('✅ Abriendo WhatsApp...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareVideoFacebook = () => {
    if (generatedVideo) {
      handleDownloadVideo();
      setTimeout(() => {
        socialShareService.shareToFacebook(shareText);
        setShareMessage('✅ Video descargado! Adjúntalo en Facebook');
      }, 500);
    } else {
      socialShareService.shareToFacebook(shareText);
      setShareMessage('✅ Abriendo Facebook...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareVideoInstagram = () => {
    // Auto-download video first
    if (generatedVideo) {
      handleDownloadVideo();
      setTimeout(() => {
        socialShareService.shareToInstagram('');
        setShareMessage('✅ Video descargado! Adjúntalo en Instagram Stories/Reels');
      }, 500);
    } else {
      socialShareService.shareToInstagram('');
      setShareMessage('✅ Abriendo Instagram...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleShareVideoTikTok = () => {
    // Auto-download video first
    if (generatedVideo) {
      handleDownloadVideo();
      setTimeout(() => {
        socialShareService.shareToTikTok('');
        setShareMessage('✅ Video descargado! Adjúntalo en TikTok');
      }, 500);
    } else {
      socialShareService.shareToTikTok('');
      setShareMessage('✅ Abriendo TikTok...');
    }
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleDownloadCard = () => {
    if (type === 'achievement') {
      socialShareService.downloadAchievementCard(data as ShareableAchievement);
      setShareMessage('✅ Tarjeta HTML descargada!');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="bg-slate-900 rounded-xl sm:rounded-2xl border-2 border-slate-700 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 sm:p-6">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                {type === 'achievement' ? '🏆 Compartir Logro' : '♟️ Compartir Partida'}
              </h2>
              <p className="text-purple-100 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">Comparte tu progreso con el mundo</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 transition-all text-sm sm:text-base flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
          {/* Generated Image Preview */}
          {generatingImage ? (
            <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-6 sm:p-8 border border-slate-700 text-center">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-pulse">🎨</div>
              <div className="text-slate-400 text-sm sm:text-base">Generando imagen compartible...</div>
            </div>
          ) : generatedImage ? (
            <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2">
                <div className="text-xs sm:text-sm text-slate-400 font-semibold flex items-center gap-1">
                  <span>📸</span>
                  <span className="hidden xs:inline">Imagen Generada</span>
                </div>
                <button
                  onClick={handleDownloadImage}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center gap-1 sm:gap-2 flex-shrink-0"
                >
                  <span>💾</span>
                  <span className="hidden xs:inline">Descargar</span>
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-1.5 sm:p-2 overflow-hidden">
                <img
                  src={generatedImage}
                  alt="Preview"
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: '250px', objectFit: 'contain' }}
                />
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 text-center">
                Optimizada para redes sociales (1200x630px)
              </div>

              {/* Separate Share Buttons for Image */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700">
                <div className="text-[10px] sm:text-xs text-slate-400 mb-2 text-center font-semibold">
                  Compartir<span className="hidden xs:inline"> esta imagen</span> en:
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    onClick={handleShareImageTwitter}
                    className="bg-black hover:bg-gray-900 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs">X (Twitter)</span>
                  </button>
                  <button
                    onClick={handleShareImageWhatsApp}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs">WhatsApp</span>
                  </button>
                  <button
                    onClick={handleShareImageFacebook}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs">Facebook</span>
                  </button>
                  <button
                    onClick={handleShareImageDiscord}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs">Discord</span>
                  </button>
                  <button
                    onClick={handleShareImageInstagram}
                    className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs">Instagram</span>
                  </button>
                  <button
                    onClick={handleShareImageTikTok}
                    className="bg-black hover:bg-gray-900 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                    <span className="text-[10px] sm:text-xs">TikTok</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Video Generation (only for games) */}
          {type === 'game' && (
            <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2">
                <div className="text-xs sm:text-sm text-slate-400 font-semibold flex items-center gap-1">
                  <span>🎬</span>
                  <span className="hidden xs:inline">Video Replay</span>
                </div>
                {!generatedVideo && !generatingVideo && (
                  <button
                    onClick={handleGenerateVideo}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-1 sm:gap-2 flex-shrink-0"
                  >
                    <span>🎬</span>
                    <span className="hidden xs:inline">Generar</span>
                  </button>
                )}
                {generatedVideo && (
                  <button
                    onClick={handleDownloadVideo}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg transition-all flex items-center gap-1 sm:gap-2 flex-shrink-0"
                  >
                    <span>💾</span>
                    <span className="hidden xs:inline">Descargar</span>
                  </button>
                )}
              </div>

              {generatingVideo ? (
                <div className="bg-slate-900/50 rounded-lg p-6 sm:p-8 text-center">
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-bounce">🎥</div>
                  <div className="text-slate-400 mb-3 sm:mb-4 text-sm sm:text-base">Generando video replay...</div>
                  <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-2">{videoProgress}%</div>
                </div>
              ) : generatedVideo ? (
                <div>
                  <div className="bg-slate-900/50 rounded-lg p-1.5 sm:p-2 overflow-hidden">
                    <video
                      src={URL.createObjectURL(generatedVideo)}
                      controls
                      className="w-full h-auto rounded-lg"
                      style={{ maxHeight: '250px' }}
                    />
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 text-center leading-tight">
                      {generatedVideo.type === 'video/mp4'
                        ? '✅ Formato MP4 (1280x720px HD, 30fps) - Compatible con todas las plataformas'
                        : '✅ Formato WebM (1280x720px HD, 30fps) - Compatible con Chrome, Firefox, Edge, Safari'}
                    </div>
                  </div>

                  {/* Separate Share Buttons for Video */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700">
                    <div className="text-[10px] sm:text-xs text-slate-400 mb-2 text-center font-semibold">
                      Compartir<span className="hidden xs:inline"> este video</span> en:
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <button
                        onClick={handleShareVideoTwitter}
                        className="bg-black hover:bg-gray-900 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs">X (Twitter)</span>
                      </button>
                      <button
                        onClick={handleShareVideoWhatsApp}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs">WhatsApp</span>
                      </button>
                      <button
                        onClick={handleShareVideoFacebook}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs">Facebook</span>
                      </button>
                      <button
                        onClick={handleShareVideoDiscord}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs">Discord</span>
                      </button>
                      <button
                        onClick={handleShareVideoInstagram}
                        className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs">Instagram</span>
                      </button>
                      <button
                        onClick={handleShareVideoTikTok}
                        className="bg-black hover:bg-gray-900 text-white rounded-lg py-2 sm:py-2.5 px-2 sm:px-3 transition-all flex flex-col items-center justify-center gap-1 text-xs sm:text-sm"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs">TikTok</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-lg p-6 sm:p-8 text-center border-2 border-dashed border-slate-700">
                  <div className="text-3xl sm:text-4xl mb-2">🎬</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Haz clic en "Generar" para crear un replay animado de la partida</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 mt-2">
                    📹 Incluye intro, análisis<span className="hidden xs:inline"> de jugadas</span> y highlights
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-600 mt-1 leading-tight">
                    🎞️ Formato: WebM (compatible<span className="hidden xs:inline"> con todos los navegadores modernos</span>)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Preview */}
          <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-700">
            <div className="text-xs sm:text-sm text-slate-400 mb-2 flex items-center gap-1">
              <span>📋</span>
              <span>Texto<span className="hidden xs:inline"> para Compartir</span>:</span>
            </div>
            <div className="text-white whitespace-pre-line text-xs sm:text-sm font-mono bg-slate-900/50 p-3 sm:p-4 rounded-lg leading-relaxed">
              {shareText}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 text-center">
              ✨ Este texto se copiará/compartirá automáticamente<span className="hidden xs:inline"> con los botones de arriba</span>
            </div>
          </div>

          {/* Game Highlights (only for games) */}
          {type === 'game' && 'highlights' in data && data.highlights.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-slate-700">
              <h3 className="text-white font-bold mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <span className="text-lg sm:text-xl">⭐</span> Momentos Destacados
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {data.highlights.map((highlight, idx) => {
                  const emoji = highlight.type === 'brilliant' ? '🌟' :
                               highlight.type === 'blunder' ? '💥' : '🔥';
                  const color = highlight.type === 'brilliant' ? 'text-yellow-400' :
                               highlight.type === 'blunder' ? 'text-red-400' : 'text-orange-400';

                  return (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <span className={`text-xl sm:text-2xl ${color} flex-shrink-0`}>{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-xs sm:text-base truncate">Jugada {highlight.moveNumber}: {highlight.notation}</div>
                        <div className="text-slate-400 text-[11px] sm:text-sm line-clamp-2">{highlight.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success Message */}
          {shareMessage && (
            <div className={`
              text-center p-3 sm:p-4 rounded-lg text-xs sm:text-sm
              ${copySuccess ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}
            `}>
              {shareMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-2.5 sm:p-4 border-t border-slate-700">
          <div className="text-xs sm:text-sm text-slate-400 text-center leading-tight">
            💡 Tip: Comparte tus logros<span className="hidden xs:inline"> para inspirar a otros jugadores</span>
          </div>
        </div>
      </div>
    </div>
  );
}
