document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('video[controls]').forEach(function (video) {
    video.removeAttribute('controls');
    video.muted = true;

    var container = video.closest('.video-wrapper') || video.parentNode;

    // Creamos un "marco" que envuelve el contenedor del video + la barra
    var frame = document.createElement('div');
    frame.className = 'svg-video-frame';
    container.parentNode.insertBefore(frame, container);
    frame.appendChild(container);

    var bar = document.createElement('div');
    bar.className = 'svg-video-bar';
    bar.innerHTML =
      '<button class="svg-video-play" type="button">▶</button>' +
      '<input class="svg-video-progress" type="range" min="0" max="100" step="0.1" value="0">' +
      '<button class="svg-video-full" type="button">⛶</button>';
    frame.appendChild(bar);

    var playBtn = bar.querySelector('.svg-video-play');
    var progress = bar.querySelector('.svg-video-progress');
    var fullBtn = bar.querySelector('.svg-video-full');

    playBtn.addEventListener('click', function () {
      if (video.paused) { video.play(); } else { video.pause(); }
    });
    video.addEventListener('play', function () { playBtn.textContent = '⏸'; });
    video.addEventListener('pause', function () { playBtn.textContent = '▶'; });
    video.addEventListener('ended', function () { playBtn.textContent = '▶'; });

    video.addEventListener('timeupdate', function () {
      if (video.duration) progress.value = (video.currentTime / video.duration) * 100;
    });
    progress.addEventListener('input', function () {
      if (video.duration) video.currentTime = (progress.value / 100) * video.duration;
    });

    // Ponemos en pantalla completa el "marco" (video + barra), no el video solo
    fullBtn.addEventListener('click', function () {
      if (frame.requestFullscreen) frame.requestFullscreen();
      else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    });
  });
});