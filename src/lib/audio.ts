export const playPopSound = () => {
  // Try to play a generic pop sound if available
  try {
    const audio = new Audio('/sounds/pop.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};

export const playEpicSound = () => {
  try {
    const audio = new Audio('/sounds/epic.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};

export const playSwooshSound = () => {
  try {
    const audio = new Audio('/sounds/swoosh.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};

export const playCrackSound = () => {
  try {
    const audio = new Audio('/sounds/crack.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};
