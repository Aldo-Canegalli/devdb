import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function LoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    let interval;
    let isCompleted = false;
    let imagesLoaded = 0;
    let totalImages = 0;

    // Contar imágenes en la página
    const images = document.querySelectorAll('img');
    totalImages = images.length;

    // Si hay imágenes, escuchar su carga
    if (totalImages > 0) {
      images.forEach((img) => {
        if (img.complete) {
          imagesLoaded++;
        } else {
          img.addEventListener('load', () => {
            imagesLoaded++;
            // Actualizar progreso basado en imágenes cargadas
            const imgProgress = (imagesLoaded / totalImages) * 30;
            setProgress(prev => Math.min(prev + 5, 90));
          });
          img.addEventListener('error', () => {
            imagesLoaded++;
          });
        }
      });
    }

    // Avance progresivo
    let current = 0;
    interval = setInterval(() => {
      if (!isCompleted) {
        const increment = Math.max(0.5, (90 - current) * 0.06 + 0.5);
        current = Math.min(current + increment, 90);
        setProgress(current);
      }
    }, 80);

    // Completar cuando la página cargue
    const handleLoad = () => {
      isCompleted = true;
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    const fallback = setTimeout(() => {
      if (!isCompleted) handleLoad();
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
      window.removeEventListener('load', handleLoad);
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: '#1a1e29',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: '#01c38e',
          transition: 'width 0.15s ease-out',
          boxShadow: '0 0 15px rgba(1, 195, 142, 0.5)',
        }}
      />
    </div>
  );
}

export default LoadingBar;