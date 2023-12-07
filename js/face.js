// Set up variables
const video1 = document.getElementsByClassName('input_video1')[0];
const out1 = document.getElementsByClassName('output1')[0];
const controlsElement1 = document.getElementsByClassName('control1')[0];
const canvasCtx1 = out1.getContext('2d');
const fpsControl = new FPS();

const spinner = document.querySelector('.loading');
// Hide the spinner when its transition ends
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

// Create an array to store the detected face landmarks
let savedLandmarks = [];

// Function to handle face detection results and save the landmarks
function onResultsFace(results) {
  // Add a CSS class to indicate that the page is loaded and ready to display content
  document.body.classList.add('loaded');
  // Update the FPS measurement to keep track of the frame rate
  fpsControl.tick();
  // Save the current canvas state
  canvasCtx1.save();
  // Clear the canvas to remove previous face detection results
  canvasCtx1.clearRect(0, 0, out1.width, out1.height);
  // Draw the current video frame on the canvas
  canvasCtx1.drawImage(results.image, 0, 0, out1.width, out1.height);

  // Check if there are any face detections
  if (results.detections.length > 0) {
    // Draw a blue rectangle around the detected face
    drawRectangle(
      canvasCtx1,
      results.detections[0].boundingBox,
      {color: 'blue', lineWidth: 4, fillColor: '#00000000'}
    );
    // Draw red landmarks (facial features) on the canvas
    drawLandmarks(canvasCtx1, results.detections[0].landmarks, {
      color: 'red',
      radius: 5,
    });

    // Save the detected landmarks in the 'savedLandmarks' array
    savedLandmarks.push(results.detections[0].landmarks);
  }

  // Restore the previously saved canvas state
  canvasCtx1.restore();
}

// Set up face detection using MediaPipe library
const faceDetection = new FaceDetection({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.0/${file}`;
  }
});
// Attach the `onResultsFace` function as the callback for handling face detection results
faceDetection.onResults(onResultsFace);

// Set up the camera to capture video from the 'video1' element
const camera = new Camera(video1, {
  // The `onFrame` callback sends each video frame to the face detection model for processing
  onFrame: async () => {
    await faceDetection.send({image: video1});
  },
  width: 480, // The width of the video frame
  height: 480 // The height of the video frame
});
// Start capturing video from the camera
camera.start();

// Create a control panel to adjust face detection settings
new ControlPanel(controlsElement1, {
  // Set initial settings for the control panel
  selfieMode: true, // Run face detection in "selfie mode"
  minDetectionConfidence: 0.5 // Set the minimum detection confidence score to 0.5
})
  // Add UI components to the control panel (title, FPS display, selfie mode toggle, and confidence slider)
  .add([
    new StaticText({title: 'MediaPipe Face Detection'}),
    fpsControl,
    new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  // Listen for changes to the controls and apply the corresponding settings
  .on(options => {
    // Toggle a CSS class on the 'video1' element to indicate selfie mode
    video1.classList.toggle('selfie', options.selfieMode);
    // Update the face detection settings based on the control panel options
    faceDetection.setOptions(options);
  });

// Function to clear the saved landmarks
function clearSavedLandmarks() {
  savedLandmarks = [];
}

// Function to download the saved landmarks as JSON
function downloadSavedLandmarks() {
  const data = JSON.stringify(savedLandmarks);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'face_landmarks.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
