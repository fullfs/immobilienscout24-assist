module.exports = function getResolution() {
  const number = Math.floor(Math.random() * 100)
  if (number > 96) {
    return { width: 3840, height: 2160 }
  } else if (number > 88) {
    return { width: 2048, height: 1080 }
  } else if (number > 82) {
    return { width: 2560, height: 1440 }
  } else if (number > 75) {
    return { width: 1280, height: 720 }
  } else {
    return { width: 1920, height: 1080 }
  }
}