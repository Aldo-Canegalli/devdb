import { useState, useEffect } from 'react';

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 3000; // 2 segundos mínimo visible
    let current = 0;
    let isComplete = false;

    // Avance progresivo hasta 90%
    const interval = setInterval(() => {
      if (!isComplete) {
        current += Math.random() * 5 + 2;
        if (current > 90) current = 90;
        setProgress(current);
      }
    }, 80);

    // Cuando la página cargue, esperar el tiempo mínimo
    const handleLoad = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

      isComplete = true;
      clearInterval(interval);

      // Si ya pasó el tiempo mínimo, completar inmediato
      if (remaining === 0) {
        setProgress(100);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 400);
      } else {
        // Si no ha pasado el tiempo mínimo, esperar
        // Subir el progreso al 100% lentamente
        let extraProgress = 90;
        const slowInterval = setInterval(() => {
          extraProgress += 2;
          if (extraProgress >= 100) {
            extraProgress = 100;
            clearInterval(slowInterval);
            setTimeout(() => {
              if (onComplete) onComplete();
            }, 300);
          }
          setProgress(extraProgress);
        }, 50);

        // También usar el tiempo restante como fallback
        setTimeout(() => {
          setProgress(100);
          clearInterval(slowInterval);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 300);
        }, remaining);
      }
    };

    // Si la página ya está cargada, iniciar el proceso
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    // Fallback: si la página no carga en 5 segundos, completar igual
    const fallback = setTimeout(() => {
      if (!isComplete) {
        handleLoad();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
      window.removeEventListener('load', handleLoad);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-[#1a1e29] flex items-center justify-center">
      <div className="text-center max-w-sm w-full px-6">
        {/* Logo */}
        <div className="w-24 h-24 bg-[#01c38e] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-[#1a1e29] font-bold text-5xl">&lt;/&gt;</span>
        </div>

        {/* Nombre */}
        <h1 className="text-3xl font-bold text-white mb-2">DevDB</h1>
        <p className="text-gray-400 text-sm mb-6">Cargando plataforma...</p>

        {/* Barra de progreso */}
        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#01c38e] rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Porcentaje */}
        <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

export default LoadingScreen;