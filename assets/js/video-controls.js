document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('video[controls]').forEach(function (video) {
    video.removeAttribute('controls');

    var bar = document.createElement('div');
    bar.className = 'svg-video-bar';
    bar.innerHTML =
      '<button class="svg-video-play" type="button">▶</button>' +
      '<input class="svg-video-progress" type="range" min="0" max="100" step="0.1" value="0">' +
      '<button class="svg-video-full" type="button">⛶</button>';

    // Insertamos la barra DESPUÉS del contenedor del video, no adentro,
    // para que no quede recortada por el overflow:hidden del .video-wrapper
    var container = video.closest('.video-wrapper') || video.parentNode;
    container.insertAdjacentElement('afterend', bar);

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

    fullBtn.addEventListener('click', function () {
      if (video.requestFullscreen) video.requestFullscreen();
      else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    });
  });
});