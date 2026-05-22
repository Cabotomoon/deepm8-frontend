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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {type === 'achievement' ? '🏆 Compartir Logro' : '♟️ Compartir Partida'}
              </h2>
              <p className="text-purple-100 text-sm mt-1">Comparte tu progreso con el mundo</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg px-4 py-2 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Generated Image Preview */}
          {generatingImage ? (
            <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 text-center">
              <div className="text-6xl mb-4 animate-pulse">🎨</div>
              <div className="text-slate-400">Generando imagen compartible...</div>
            </div>
          ) : generatedImage ? (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-slate-400 font-semibold">📸 Imagen Generada</div>
                <button
                  onClick={handleDownloadImage}
                  className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center gap-2"
                >
                  <span>💾</span> Descargar
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 overflow-hidden">
                <img
                  src={generatedImage}
                  alt="Preview"
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-2 text-center">
                Optimizada para redes sociales (1200x630px)
              </div>

              {/* Separate Share Buttons for Image */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-2 text-center font-semibold">Compartir esta imagen en:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleShareImageTwitter}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="text-lg">𝕏</span> Twitter
                  </button>
                  <button
                    onClick={handleShareImageWhatsApp}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="text-lg">💚</span> WhatsApp
                  </button>
                  <button
                    onClick={handleShareImageFacebook}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="text-lg">📘</span> Facebook
                  </button>
                  <button
                    onClick={handleShareImageDiscord}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="text-lg">💬</span> Discord
                  </button>
                  <button
                    onClick={handleShareImageInstagram}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="text-lg">📷</span> Instagram
                  </button>
                  <button
                    onClick={handleShareImageTikTok}
                    className="bg-black hover:bg-gray-900 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <span className="text-lg">🎵</span> TikTok
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Video Generation (only for games) */}
          {type === 'game' && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-slate-400 font-semibold">🎬 Video Replay</div>
                {!generatedVideo && !generatingVideo && (
                  <button
                    onClick={handleGenerateVideo}
                    className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2"
                  >
                    <span>🎬</span> Generar
                  </button>
                )}
                {generatedVideo && (
                  <button
                    onClick={handleDownloadVideo}
                    className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg transition-all flex items-center gap-2"
                  >
                    <span>💾</span> Descargar
                  </button>
                )}
              </div>

              {generatingVideo ? (
                <div className="bg-slate-900/50 rounded-lg p-8 text-center">
                  <div className="text-6xl mb-4 animate-bounce">🎥</div>
                  <div className="text-slate-400 mb-4">Generando video replay...</div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <div className="text-sm text-slate-500 mt-2">{videoProgress}%</div>
                </div>
              ) : generatedVideo ? (
                <div>
                  <div className="bg-slate-900/50 rounded-lg p-2 overflow-hidden">
                    <video
                      src={URL.createObjectURL(generatedVideo)}
                      controls
                      className="w-full h-auto rounded-lg"
                      style={{ maxHeight: '300px' }}
                    />
                    <div className="text-xs text-slate-500 mt-2 text-center">
                      {generatedVideo.type === 'video/mp4'
                        ? '✅ Formato MP4 (1280x720px HD, 30fps) - Compatible con todas las plataformas'
                        : '✅ Formato WebM (1280x720px HD, 30fps) - Compatible con Chrome, Firefox, Edge, Safari'}
                    </div>
                  </div>

                  {/* Separate Share Buttons for Video */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-2 text-center font-semibold">Compartir este video en:</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={handleShareVideoTwitter}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <span className="text-lg">𝕏</span> Twitter
                      </button>
                      <button
                        onClick={handleShareVideoWhatsApp}
                        className="bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <span className="text-lg">💚</span> WhatsApp
                      </button>
                      <button
                        onClick={handleShareVideoFacebook}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <span className="text-lg">📘</span> Facebook
                      </button>
                      <button
                        onClick={handleShareVideoDiscord}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <span className="text-lg">💬</span> Discord
                      </button>
                      <button
                        onClick={handleShareVideoInstagram}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <span className="text-lg">📷</span> Instagram
                      </button>
                      <button
                        onClick={handleShareVideoTikTok}
                        className="bg-black hover:bg-gray-900 text-white rounded-lg py-2 px-3 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <span className="text-lg">🎵</span> TikTok
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-lg p-8 text-center border-2 border-dashed border-slate-700">
                  <div className="text-4xl mb-2">🎬</div>
                  <div className="text-slate-400 text-sm">Haz clic en "Generar" para crear un replay animado de la partida</div>
                  <div className="text-xs text-slate-500 mt-2">
                    📹 Incluye intro, análisis de jugadas y highlights
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    🎞️ Formato: WebM (compatible con todos los navegadores modernos)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Preview */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-2">📋 Texto para Compartir:</div>
            <div className="text-white whitespace-pre-line text-sm font-mono bg-slate-900/50 p-4 rounded-lg">
              {shareText}
            </div>
            <div className="text-xs text-slate-500 mt-2 text-center">
              ✨ Este texto se copiará/compartirá automáticamente con los botones de arriba
            </div>
          </div>

          {/* Game Highlights (only for games) */}
          {type === 'game' && 'highlights' in data && data.highlights.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span>⭐</span> Momentos Destacados
              </h3>
              <div className="space-y-3">
                {data.highlights.map((highlight, idx) => {
                  const emoji = highlight.type === 'brilliant' ? '🌟' :
                               highlight.type === 'blunder' ? '💥' : '🔥';
                  const color = highlight.type === 'brilliant' ? 'text-yellow-400' :
                               highlight.type === 'blunder' ? 'text-red-400' : 'text-orange-400';

                  return (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-4 flex items-center gap-3">
                      <span className={`text-2xl ${color}`}>{emoji}</span>
                      <div className="flex-1">
                        <div className="text-white font-semibold">Jugada {highlight.moveNumber}: {highlight.notation}</div>
                        <div className="text-slate-400 text-sm">{highlight.description}</div>
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
              text-center p-4 rounded-lg
              ${copySuccess ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}
            `}>
              {shareMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-4 border-t border-slate-700">
          <div className="text-sm text-slate-400 text-center">
            💡 Tip: Comparte tus logros para inspirar a otros jugadores
          </div>
        </div>
      </div>
    </div>
  );
}
