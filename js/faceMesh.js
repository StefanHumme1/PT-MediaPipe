// Set up variables
const video2 = document.getElementsByClassName('input_video2')[0];
const out2 = document.getElementsByClassName('output2')[0];
const controlsElement2 = document.getElementsByClassName('control2')[0];
const canvasCtx = out2.getContext('2d');

const fpsControl = new FPS();
const spinner = document.querySelector('.loading');
// Hide the spinner when its transition ends
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

// Create an array to store the detected face landmarks
let savedLandmarks = [];

// Function to handle face mesh detection results and save the landmarks
function onResultsFaceMesh(results) {
  // Add a CSS class to indicate that the page is loaded and ready to display content
  document.body.classList.add('loaded');
  // Update the FPS measurement to keep track of the frame rate
  fpsControl.tick();

  // Save the current canvas state
  canvasCtx.save();
  // Clear the canvas to remove previous face mesh detection results
  canvasCtx.clearRect(0, 0, out2.width, out2.height);
  // Draw the current video frame on the canvas
  canvasCtx.drawImage(results.image, 0, 0, out2.width, out2.height);

  // Check if there are any face landmarks detected
  if (results.multiFaceLandmarks) {
    // Iterate through all the detected faces and draw the face mesh landmarks
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_TESSELATION,
        {color: '#C0C0C070', lineWidth: 1});
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_RIGHT_EYE,
        {color: '#FF3030'});
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW,
        {color: '#FF3030'});
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_LEFT_EYE,
        {color: '#30FF30'});
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW,
        {color: '#30FF30'});
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_FACE_OVAL,
        {color: '#E0E0E0'});
      drawConnectors(
        canvasCtx, landmarks, FACEMESH_LIPS,
        {color: '#E0E0E0'});

      // Save the detected landmarks in the 'savedLandmarks' array
      savedLandmarks.push(landmarks);
    }
  }
  // Restore the previously saved canvas state
  canvasCtx.restore();
}

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

// Set up face mesh detection using MediaPipe library
const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
  }
});
// Attach the `onResultsFaceMesh` function as the callback for handling face mesh detection results
faceMesh.onResults(onResultsFaceMesh);

// Set up the camera to capture video from the 'video2' element
const camera = new Camera(video2, {
  // The `onFrame` callback sends each video frame to the face mesh detection model for processing
  onFrame: async () => {
    await faceMesh.send({image: video2});
  },
  width: 480, // The width of the video frame
  height: 480 // The height of the video frame
});
// Start capturing video from the camera
camera.start();

// Create a control panel to adjust face mesh detection settings
new ControlPanel(controlsElement2, {
  // Set initial settings for the control panel
  selfieMode: true, // Run face mesh detection in "selfie mode"
  maxNumFaces: 1, // Limit the detection to one face
  minDetectionConfidence: 0.5, // Set the minimum detection confidence score to 0.5
  minTrackingConfidence: 0.5 // Set the minimum tracking confidence score to 0.5
})
  // Add UI components to the control panel (title, FPS display, selfie mode toggle, and confidence sliders)
  .add([
    new StaticText({title: 'MediaPipe Face Mesh'}),
    fpsControl,
    new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
    new Slider({
      title: 'Max Number of Faces',
      field: 'maxNumFaces',
      range: [1, 4],
      step: 1
    }),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  // Listen for changes to the controls and apply the corresponding settings
  .on(options => {
    // Toggle a CSS class on the 'video2' element to indicate selfie mode
    video2.classList.toggle('selfie', options.selfieMode);
    // Update the face mesh detection settings based on the control panel options
    faceMesh.setOptions(options);
  });
