let mediaRecorder;
let recordedChunks = [];

// Start recording the canvas stream
function startRecording() {
    landmarksCache = [];  // Reset the landmarks cache

    const stream = out5.captureStream(25);  // 25 fps, adjust as needed
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    

    mediaRecorder.onstop = function() {
        const blob = new Blob(recordedChunks, {
            type: 'video/webm'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'recordedSession.webm';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
}

// Stop recording
function stopRecording() {
    mediaRecorder.stop();
}
// Get the video element for input, the canvas element for output, and the control element
const video5 = document.getElementsByClassName('input_video5')[0];
const out5 = document.getElementsByClassName('output5')[0];
const controlsElement5 = document.getElementsByClassName('control5')[0];

// Get the 2D drawing context of the output canvas
const canvasCtx5 = out5.getContext('2d');

// Create an FPS (Frames Per Second) control to track the frame rate
const fpsControl = new FPS();

const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

// Get the loading spinner element and hide it when the transition ends
function zColor(data) {
    const z = clamp(data.from.z + 0.5, 0, 1);
    return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}

// Declare a variable to store the pose landmarks data
let landmarksCache = [];

// Modified function to add a timestamp to each individual landmark
function cachePoseLandmarks(results) {
    const currentTimeStamp = new Date().toISOString();
    const timestampedLandmarks = results.poseLandmarks.map(landmark => ({
        timestamp: currentTimeStamp,
        landmark: landmark
    }));
    landmarksCache.push(timestampedLandmarks);
}

function saveCachedLandmarks() {
    const exportData = {
        description: "This JSON contains cached pose landmarks. i forgout where was it",
        data: landmarksCache
    };

    const json = JSON.stringify(exportData);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'cachedPoseLandmarks.json';

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
}
// Callback function for pose detection results
function onResultsPose(results) {
    // Add the 'loaded' class to the body to indicate that the results are ready
    document.body.classList.add('loaded');
    // Update the FPS display
    fpsControl.tick();
// Save the current canvas state, clear it, and draw the image from results
    canvasCtx5.save();
    canvasCtx5.clearRect(0, 0, out5.width, out5.height);
    canvasCtx5.drawImage(
        results.image, 0, 0, out5.width, out5.height);
          // Draw connectors to visualize pose landmarks connections
    drawConnectors(
        canvasCtx5, results.poseLandmarks, POSE_CONNECTIONS, {
            color: (data) => {
                const x0 = out5.width * data.from.x;
                const y0 = out5.height * data.from.y;
                const x1 = out5.width * data.to.x;
                const y1 = out5.height * data.to.y;

                const z0 = clamp(data.from.z + 0.5, 0, 1);
                const z1 = clamp(data.to.z + 0.5, 0, 1);

                const gradient = canvasCtx5.createLinearGradient(x0, y0, x1, y1);
                gradient.addColorStop(
                    0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
                gradient.addColorStop(
                    1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
                return gradient;
            }
        });

  // Draw pose landmarks for left, right, and neutral poses with specified colors
    drawLandmarks(
        canvasCtx5,
        Object.values(POSE_LANDMARKS_LEFT)
            .map(index => results.poseLandmarks[index]),
        { color: zColor, fillColor: '#FF0000' });
    drawLandmarks(
        canvasCtx5,
        Object.values(POSE_LANDMARKS_RIGHT)
            .map(index => results.poseLandmarks[index]),
        { color: zColor, fillColor: '#00FF00' });
    drawLandmarks(
        canvasCtx5,
        Object.values(POSE_LANDMARKS_NEUTRAL)
            .map(index => results.poseLandmarks[index]),
        { color: zColor, fillColor: '#AAAAAA' });
    canvasCtx5.restore();

    // Cache the landmarks
    cachePoseLandmarks(results);
}

// Create an instance of the Pose class for pose detection
const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
}});
// Set the onResultsPose function as the callback for pose detection results
pose.onResults(onResultsPose);

// Create a Camera instance for video input
const camera = new Camera(video5, {
    onFrame: async () => {
        await pose.send({image: video5});
    },
    width: 480,
    height: 480
});

// Start capturing video from the camera
camera.start();

// Create a ControlPanel with various options for pose detection
new ControlPanel(controlsElement5, {
    selfieMode: true,
    upperBodyOnly: false,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})
    .add([
        new StaticText({title: 'MediaPipe Pose'}),
        fpsControl,
        new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
        new Toggle({title: 'Upper-body Only', field: 'upperBodyOnly'}),
        new Toggle({title: 'Smooth Landmarks', field: 'smoothLandmarks'}),
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
    .on(options => {
        video5.classList.toggle('selfie', options.selfieMode);
        pose.setOptions(options);
    });

// UI for downloading cached landmarks on demand
document.getElementById('downloadButton').addEventListener('click', saveCachedLandmarks);
