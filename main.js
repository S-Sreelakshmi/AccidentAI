// Initialize Lucide Icons
lucide.createIcons();

const DEMO_MODE = false;

/* =========================================
   DOM ELEMENTS
   ========================================= */
// Screens
const standbyScreen = document.getElementById('standbyScreen');
const crashScreen = document.getElementById('crashScreen');
const scannerScreen = document.getElementById('scannerScreen');

// Screen 1 Elements
const sosButton = document.getElementById('sosButton');
const progressRingContainer = document.querySelector('.progress-ring');
const circle = document.querySelector('.progress-ring__circle');
const simulateCrashBtn = document.getElementById('simulateCrashBtn');
const simulateOfflineBtn = document.getElementById('simulateOfflineBtn');
const openScannerBtn = document.getElementById('openScannerBtn');
const offlineBanner = document.getElementById('offlineBanner');
const manualSmsBtn = document.getElementById('manualSmsBtn');

// Screen 2 Elements
const cancelSosBtn = document.getElementById('cancelSosBtn');
const sendSosBtn = document.getElementById('sendSosBtn');
const countdownTimerEl = document.getElementById('countdownTimer');
const countdownTextEl = document.getElementById('countdownText');
const countdownCircle = document.getElementById('countdownCircle');
const sendingModeText = document.getElementById('sendingModeText');

// Screen 3 Elements
const closeScannerBtn = document.getElementById('closeScannerBtn');
const captureScanBtn = document.getElementById('captureScanBtn');
const scanLaser = document.getElementById('scanLaser');
const vehicleDataItem = document.getElementById('vehicleDataItem');
const vehicleDataVal = document.getElementById('vehicleDataVal');
const ownerDataVal = document.getElementById('ownerDataVal');
const insuranceDataVal = document.getElementById('insuranceDataVal');
const rcStatusDataVal = document.getElementById('rcStatusDataVal');
const detailsCard = document.getElementById('detailsCard');
const rescanCardBtn = document.getElementById('rescanCardBtn');


// Screen 5 Elements (Profile)
const medicalIdScreen = document.getElementById('medicalIdScreen');
const navProfile = document.getElementById('navProfile');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const medicalIdForm = document.getElementById('medicalIdForm');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const saveBtnText = document.getElementById('saveBtnText');
const saveCheckIcon = document.getElementById('saveCheckIcon');

let qrcode;

// Screen 6 Elements (History)
const historyScreen = document.getElementById('historyScreen');
const navHistory = document.getElementById('navHistory');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');
const historyEmptyState = document.getElementById('historyEmptyState');

/* =========================================
   SCREEN 1 LOGIC (Manual hold 3s)
   ========================================= */
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

let pressTimer;
let progressInterval;
let progress = 0;
const DURATION = 3000; // 3 seconds
const INTERVAL = 50;

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function startPress(e) {
    if (e.type === 'touchstart') e.preventDefault();
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    if (sosButton.classList.contains('triggered')) return;

    sosButton.classList.add('pressing');
    progressRingContainer.classList.add('active');
    
    progress = 0;
    setProgress(0);
    circle.style.transition = 'stroke-dashoffset 0.1s linear';
    
    if (navigator.vibrate) navigator.vibrate(50);
    
    progressInterval = setInterval(() => {
        progress += (INTERVAL / DURATION) * 100;
        if (progress >= 100) {
            progress = 100;
            triggerManualSOS();
        }
        setProgress(progress);
    }, INTERVAL);
}

function endPress(e) {
    if (e && e.type !== 'mouseleave') e.preventDefault();
    if (sosButton.classList.contains('triggered')) return;

    sosButton.classList.remove('pressing');
    clearInterval(progressInterval);
    
    if (progress < 100) {
        progressRingContainer.classList.remove('active');
        circle.style.transition = 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        progress = 0;
        setProgress(0);
    }
}

function triggerManualSOS() {
    clearInterval(progressInterval);
    progressRingContainer.classList.remove('active');
    
    sosButton.classList.remove('pressing');
    
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
    }
    
    // Navigate to Crash Screen with Countdown
    startAutoCrash();
    
    // Reset standby button state for later use
    resetManualSOS();
}

function resetManualSOS() {
    sosButton.classList.remove('triggered');
    sosButton.innerHTML = "<span>SOS</span>";
    progress = 0;
    setProgress(0);
    const rings = document.querySelectorAll('.ring');
    if (rings.length) {
        rings.forEach(r => r.style.animationPlayState = 'running');
    }
    const instructionText = document.querySelector('.instruction-text');
    if (instructionText) {
        instructionText.innerText = "Hold 3 seconds to trigger manually";
        instructionText.style.color = "var(--text-secondary)";
    }
}

sosButton.addEventListener('mousedown', startPress);
sosButton.addEventListener('touchstart', startPress, { passive: false });
window.addEventListener('mouseup', endPress);
sosButton.addEventListener('mouseleave', endPress);
sosButton.addEventListener('touchend', endPress);
sosButton.addEventListener('touchcancel', endPress);
sosButton.addEventListener('contextmenu', e => e.preventDefault());


/* =========================================
   OFFLINE & SMS FALLBACK LOGIC
   ========================================= */
let latestLat = "Unknown";
let latestLng = "Unknown";

// Continuously cache coordinates in the background so they are ready synchronously
let lastAddressFetch = 0;
let currentAddress = "";

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (pos) => {
            latestLat = pos.coords.latitude;
            latestLng = pos.coords.longitude;
            
            // Throttle address fetching to every 30 seconds to respect OSM API guidelines
            const now = Date.now();
            if (now - lastAddressFetch > 30000) {
                lastAddressFetch = now;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latestLat}&lon=${latestLng}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.display_name) {
                            // Focus on the most relevant part of the address (Road or Suburban)
                            const address = data.address;
                            currentAddress = address.road || address.suburb || address.city || address.town || "";
                            currentCity = address.city || address.town || address.state_district || "";
                            currentRegion = address.state || "";
                        }
                    })
                    .catch(e => console.warn("Reverse Geocode failed:", e));
            }
        },
        (err) => console.warn("Background GPS tracking ignored")
    );
}

let isSimulatedOffline = false;

function updateNetworkStatus() {
    if (!navigator.onLine || isSimulatedOffline) {
        offlineBanner.classList.add('active');
        manualSmsBtn.classList.add('active');
        if (sendingModeText) sendingModeText.innerText = "Sending via SMS";
    } else {
        offlineBanner.classList.remove('active');
        manualSmsBtn.classList.remove('active');
        if (sendingModeText) sendingModeText.innerText = "Sending SOS";
    }
}

// Attach listeners so the UI instantly adjusts when entering/leaving tunnels
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus(); // Initial boot check

// Trigger for desktop testing to bypass physical OS adapters
simulateOfflineBtn.addEventListener('click', () => {
    isSimulatedOffline = !isSimulatedOffline;
    updateNetworkStatus();
    simulateOfflineBtn.innerText = isSimulatedOffline ? "Restore Connection" : "Toggle Offline Mode";
    simulateOfflineBtn.style.color = isSimulatedOffline ? "#10B981" : "#D97706";
});

manualSmsBtn.addEventListener('click', () => {
    // Execution MUST be perfectly synchronous otherwise iOS/Android security blocks the SMS intent
    let smsPlate = "KL 11 AB 1234"; // Default static fallback
    
    // Check if the OCR tool previously extracted a live dynamic plate and stripped it down
    const currentPlateStr = vehicleDataVal ? vehicleDataVal.innerText : "";
    if (currentPlateStr && !currentPlateStr.includes("Awaiting") && !currentPlateStr.includes("NOT FOUND")) {
        if (currentPlateStr.includes("(")) {
            // Parses "Honda Activa 6G, 2022 (KL 11 AB 1234)" -> "KL 11 AB 1234"
            const match = currentPlateStr.match(/\(([^)]+)\)/);
            if (match) smsPlate = match[1];
        } else {
            smsPlate = currentPlateStr;
        }
    }

    // Prepare accurate message location mapping from background cache
    let locationStr = (latestLat === "Unknown") ? "Unable to fetch GPS" : `${latestLat.toFixed(5)}, ${latestLng.toFixed(5)}`;
    
    const messageBody = `ACCIDENT ALERT: I need help. My location: [${locationStr}]. Vehicle: ${smsPlate}. Sent via AccidentAI.`;
    
    // Construct safe OS-specific formatting wrapper
    const delimiter = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
    const uri = `sms:${delimiter}body=${encodeURIComponent(messageBody)}`;
    
    // Check if the user is testing on a Desktop Web Browser vs a Mobile Phone
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Emulate raw anchor click instead of JS window redirect to bypass aggressive popup blockers
        const a = document.createElement('a');
        a.href = uri;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        // Desktop Web Fallback Mode: Browsers on PC don't usually have a handler for "sms:" URIs.
        navigator.clipboard.writeText(messageBody).then(() => {
            alert(`[Desktop Web Test Mode]\n\nSince you are testing on a desktop web browser, the "sms:" application intent cannot launch a texting app.\n\nThe following emergency payload was instead COPIED TO YOUR CLIPBOARD:\n\n"${messageBody}"`);
        }).catch(() => {
            alert(`[Desktop Web Test Mode]\n\nEmergency Payload:\n\n${messageBody}`);
        });
    }
});


/* =========================================
   SCREEN 2 LOGIC (Auto-Crash Countdown & Accelerometer)
   ========================================= */
const countdownRadius = countdownCircle.r.baseVal.value;
const countdownCircumference = countdownRadius * 2 * Math.PI;
countdownCircle.style.strokeDasharray = `${countdownCircumference} ${countdownCircumference}`;
countdownCircle.style.strokeDashoffset = 0; // Starts full

let autoCrashTimer;
let countdownRemaining = 10;
const CRASH_DURATION = 10;
const DECELERATION_THRESHOLD = 25; // m/s^2 deceleration boundary representing a vehicle crash impact

// Hardware Accelerometer Sensor Binding
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
        if (!event.acceleration) return;
        
        // Calculate the physical 3D force vector 
        const acc = event.acceleration;
        const totalAccel = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2);
        
        // Trigger auto-crash if physical threshold is breached while phone is active in standby mode
        if (totalAccel > DECELERATION_THRESHOLD && standbyScreen.classList.contains('active')) {
            startAutoCrash();
        }
    });
}

const crashLocationValue = document.querySelector('#crashScreen .location-value');
const triageGforce = document.getElementById('triageGforce');
const triageOrientation = document.getElementById('triageOrientation');

let currentImpactG = 0;
let currentOrientation = "Upright";

function startAutoCrash() {
    // Generate simulated Edge-AI triage data for the demo
    currentImpactG = (Math.random() * 60 + 20).toFixed(1); // 20G to 80G
    currentOrientation = Math.random() > 0.8 ? "Overturned" : "Upright";
    
    if (triageGforce) triageGforce.innerText = `IMPACT: ${currentImpactG}G`;
    if (triageOrientation) triageOrientation.innerText = `ORIENTATION: ${currentOrientation}`;

    // Clear any existing timer
    clearInterval(autoCrashTimer);
    
    // Switch UI
    standbyScreen.classList.remove('active');
    crashScreen.classList.add('active');
    
    // Dynamic GPS Polling injection
    if (crashLocationValue) {
        // Use live coordinates for the detected location banner
        crashLocationValue.innerText = getDisplayLocation(true);
    }
    
    // Haptic feedback for crash urgency
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
    
    // Reset timer
    countdownRemaining = 10;
    updateCountdownUI();
    
    // Ensure transition logic is clean
    setTimeout(() => {
        countdownCircle.style.transition = 'stroke-dashoffset 1s linear';
    }, 50);

    autoCrashTimer = setInterval(() => {
        countdownRemaining--;
        updateCountdownUI();

        // LIVE GPS Update during countdown
        if (crashLocationValue) {
            crashLocationValue.innerText = getDisplayLocation(true);
        }

        // Haptic beat every second
        if (navigator.vibrate && countdownRemaining > 0) navigator.vibrate(50);
        
        if (countdownRemaining <= 0) {
            clearInterval(autoCrashTimer);
            executeAutoSOS();
        }
    }, 1000);
}

function updateCountdownUI() {
    countdownTimerEl.innerText = countdownRemaining;
    countdownTextEl.innerText = countdownRemaining;
    
    const offset = countdownCircumference - (countdownRemaining / CRASH_DURATION) * countdownCircumference;
    countdownCircle.style.strokeDashoffset = offset;
}

function cancelAutoCrash() {
    clearInterval(autoCrashTimer);
    
    // Switch Screen back
    crashScreen.classList.remove('active');
    standbyScreen.classList.add('active');
    
    // Reset SVG seamlessly
    countdownCircle.style.transition = 'none';
    countdownCircle.style.strokeDashoffset = 0;
    
    // Reset manual SOS button state just in case it was half-pressed
    resetManualSOS();

    // Log the cancellation in history
    const cancelData = {
        id: Date.now(),
        datetime: new Date().toLocaleString(),
        location: getDisplayLocation(),
        lat: latestLat,
        lng: latestLng,
        vehicle: vehicleDataVal ? vehicleDataVal.innerText : "Not scanned",
        status: "CANCELLED",
        severity: "MINOR"
    };
    saveIncident(cancelData);
}

function showConfirmationBanner(targetName) {
    // Remove existing banners if any are already present
    document.querySelectorAll('.notification-banner').forEach(el => el.remove());

    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
        <i data-lucide="check-circle"></i>
        <span>SOS sent to ${targetName}</span>
    `;

    const container = document.querySelector('.app-container');
    if (container) {
        container.appendChild(banner);
        lucide.createIcons();
        setTimeout(() => {
            banner.classList.add('show');
        }, 50);

        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 500);
        }, 4000);
    }
}

function executeAutoSOS() {
    // Stop any running countdown immediately to prevent double-logging
    clearInterval(autoCrashTimer);

    // Determine severity based on AI triage data
    let dynamicSeverity = "MODERATE";
    if (currentImpactG > 60 || currentOrientation === "Overturned") {
        dynamicSeverity = "CRITICAL";
    } else if (currentImpactG < 35) {
        dynamicSeverity = "MINOR";
    }

    // Collect data for History
    const incidentData = {
        id: Date.now(),
        datetime: new Date().toLocaleString(),
        location: getDisplayLocation(),
        lat: latestLat,
        lng: latestLng,
        vehicle: vehicleDataVal ? vehicleDataVal.innerText : "Not scanned",
        status: "PENDING", // Initial state
        severity: dynamicSeverity
    };
    saveIncident(incidentData);

    // Change UI state to sent
    countdownTimerEl.innerText = "0";
    document.querySelector('.crash-heading').innerText = "SOS SENT";
    document.querySelector('.crash-subtext').innerText = "Help is on the way. Stay calm.";
    sendSosBtn.style.display = "none";
    cancelSosBtn.style.display = "none";
    
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    
    // Get profile data for SMS sending
    const savedData = localStorage.getItem('medicalId');
    let contactPhone = "112";
    let contactName = "";
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            if (data.contactPhone && data.contactPhone.trim() !== "") {
                contactPhone = data.contactPhone.trim();
            }
            if (data.contactName && data.contactName.trim() !== "") {
                contactName = data.contactName.trim();
            }
        } catch (e) {
            console.warn("Failed to parse medicalId from localStorage", e);
        }
    }

    // Format coordinates and timestamp
    const latLongStr = (typeof latestLat === 'number' && typeof latestLng === 'number') 
        ? `${latestLat.toFixed(6)}, ${latestLng.toFixed(6)}` 
        : 'Unknown';
    const timestamp = new Date().toLocaleString();

    // Construct precise SMS content
    const messageBody = `🚨 ACCIDENT ALERT from AccidentAI: I have been in a crash and need immediate help. My location: [${latLongStr}]. Time: [${timestamp}]. Please call emergency services or contact me immediately.`;
    
    const delimiter = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
    const uri = `sms:${contactPhone}${delimiter}body=${encodeURIComponent(messageBody)}`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        const a = document.createElement('a');
        a.href = uri;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        console.log("Desktop test SMS Intent:", uri);
        // Copy to clipboard for testing fallback on desktop
        navigator.clipboard.writeText(messageBody).then(() => {
            console.log("SMS copied to clipboard (Desktop test mode)");
        }).catch(() => {});
    }

    // Show a confirmation banner "SOS sent to [contact name]" on screen after dispatch
    const targetName = contactName || contactPhone;
    showConfirmationBanner(targetName);
    
    // Simulated reset for demo purposes
    setTimeout(() => {
        document.querySelector('.crash-heading').innerText = "CRASH DETECTED";
        document.querySelector('.crash-subtext').innerHTML = '<span id="sendingModeText">Sending SOS</span> in <span id="countdownText">10</span> seconds.';
        // Re-bind the dynamically created element
        const newSendingModeText = document.getElementById('sendingModeText');
        if (newSendingModeText && (!navigator.onLine || isSimulatedOffline)) {
            newSendingModeText.innerText = "Sending via SMS";
        }
        sendSosBtn.style.display = "block";
        cancelSosBtn.style.display = "flex"; // It's a flex component for alignment if needed
        cancelAutoCrash();
    }, 6000);
}

simulateCrashBtn.addEventListener('click', startAutoCrash);
cancelSosBtn.addEventListener('click', cancelAutoCrash);
sendSosBtn.addEventListener('click', executeAutoSOS);

/* =========================================
   SCREEN 3 LOGIC (OCR SCANNER DEMO)
   ========================================= */
let stream = null;
const cameraStreamEl = document.getElementById('cameraStream');

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Prefer rear camera
        });
        cameraStreamEl.srcObject = stream;
    } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraStreamEl.srcObject = null;
        stream = null;
    }
}

openScannerBtn.addEventListener('click', () => {
    standbyScreen.classList.remove('active');
    
    // Request actual camera access
    startCamera();
    
    // Slight delay to ensure DOM updates and icons re-render if needed
    setTimeout(() => {
        scannerScreen.classList.add('active');
        lucide.createIcons();
    }, 50);
});

closeScannerBtn.addEventListener('click', () => {
    scannerScreen.classList.remove('active');
    standbyScreen.classList.add('active');
    stopCamera();
    
    // Reset scanner UI state completely
    detailsCard.classList.remove('active');
    captureScanBtn.style.display = 'flex';
    document.querySelectorAll('.bounding-box').forEach(el => el.remove());
});

async function fetchVaahanData(plateNum) {
    // 1. Enter Loading State (Shimmer)
    ownerDataVal.className = 'data-val shimmer';
    ownerDataVal.innerText = 'Loading...';
    
    insuranceDataVal.className = 'data-val shimmer';
    insuranceDataVal.innerText = 'Loading...';
    
    rcStatusDataVal.className = 'data-val shimmer';
    rcStatusDataVal.innerText = 'Loading...';
    
    // Also add shimmer temporarily to Vehicle to simulate merging API data
    vehicleDataVal.className = 'data-val shimmer';

    // 2. Mock 2-second API Delay
    await new Promise(resolve => setTimeout(resolve, 2000));
        
    // 3. Success state UI hydration
    vehicleDataVal.className = 'data-val';
    vehicleDataVal.innerText = `Honda Activa 6G, 2022 (${plateNum})`;
    
    ownerDataVal.className = 'data-val';
    ownerDataVal.innerText = "Rajesh Kumar Nair";
    
    insuranceDataVal.className = 'data-val';
    insuranceDataVal.innerText = "Valid until Dec 2026";
    
    rcStatusDataVal.className = 'data-val text-success';
    rcStatusDataVal.innerText = "Active";
}

captureScanBtn.addEventListener('click', async () => {
    // If stream is null, the camera didn't start. This is usually due to running on file:// without a server.
    if (!stream) {
        alert("Camera completely offline. You must run this HTML file via a Local HTTP Web Server (like VSCode Live Server) so the browser permits camera access. file:// protocol blocks the camera!");
        vehicleDataVal.innerHTML = "<span style='color:#E63946; font-size:12px;'>Camera access denied/blocked</span>";
        return; 
    }
    
    // UI Loading state
    scanLaser.style.display = 'block';
    captureScanBtn.disabled = true;
    captureScanBtn.innerHTML = '<i data-lucide="loader"></i> Processing...';
    lucide.createIcons();
    
    vehicleDataItem.classList.add('fetching');
    vehicleDataVal.innerHTML = '<span class="fetch-pulse">Reading plate...</span>';
    
    try {
        // Create canvas to capture specific Region of Interest (ROI)
        const canvas = document.createElement('canvas');
        const vW = cameraStreamEl.videoWidth;
        const vH = cameraStreamEl.videoHeight;
        
        // Increase crop margins massively to give the user physical wiggle room
        const cropWidth = vW * 0.8; // 80% of width
        const cropHeight = vH * 0.5; // 50% of height!
        const startX = (vW - cropWidth) / 2;
        const startY = (vH - cropHeight) / 2;

        // Scale up the image 2x for better text density in Tesseract
        const scale = 2;
        const padding = 50; // Tesseract NEEDS a solid margin/border (Quiet Zone) to find lines
        
        canvas.width = (cropWidth * scale) + (padding * 2);
        canvas.height = (cropHeight * scale) + (padding * 2);
        const ctx = canvas.getContext('2d');
        
        // Fill pure white background padding
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Disable smoothing to keep edges sharp when scaling
        ctx.imageSmoothingEnabled = false;
        
        // Draw the generous cropped region in the center of our padded canvas
        ctx.drawImage(cameraStreamEl, startX, startY, cropWidth, cropHeight, padding, padding, cropWidth * scale, cropHeight * scale);
        
        // Apply basic Grayscale Filter to drop lighting noise
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = data[i + 1] = data[i + 2] = luma;
        }
        ctx.putImageData(imgData, 0, 0);

        // UI DEBUG FEATURE: Attach the processed canvas so the user can physically see what the AI sees!
        canvas.style.position = 'absolute';
        canvas.style.top = '70px';
        canvas.style.left = '20px';
        canvas.style.width = '100px'; 
        canvas.style.border = '2px solid red';
        canvas.style.zIndex = '100';
        cameraStreamEl.parentElement.appendChild(canvas);
        setTimeout(() => canvas.remove(), 4000); // Remove thumbnail after 4 seconds
        
        // Initialize Tesseract Worker with Whitelist and Sparse Text Mode
        const worker = await Tesseract.createWorker("eng");
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
            tessedit_pageseg_mode: '11' // PSM 11: Sparse Text - Search for any bits of text scattered anywhere
        });
        
        // Execute OCR
        const result = await worker.recognize(canvas);
        const text = result.data.text;
        
        // Ensure worker dies to prevent memory exhaustion spanning multiple scans
        await worker.terminate();
        
        // Remove ALL remaining noise, spaces, or stray artifacts
        const cleaned = text.replace(/[^A-Z0-9]/g, '');
        
        // Format to standard Indian Plate spacing (e.g. KL 11 AB 1234) if it fits the general length
        let finalPlate = "PLATE NOT FOUND";
        let isValidPlate = false;
        if (cleaned.length >= 6) {
            isValidPlate = true;
            if (cleaned.length >= 8) {
               finalPlate = cleaned.substring(0,2) + " " + cleaned.substring(2,4) + " " + cleaned.substring(4, cleaned.length-4) + " " + cleaned.substring(cleaned.length-4);
            } else {
               finalPlate = cleaned;
            }
        } else if (cleaned.length >= 4) {
             isValidPlate = true;
             finalPlate = cleaned;
        }
        
        // UI Success setup
        vehicleDataVal.innerText = finalPlate;
        
        // If plate found, handle advanced UX success pipeline
        if (isValidPlate) {
            // Trigger Vaahan Simulation
            fetchVaahanData(finalPlate);
            
            // 1. FREEZE CAMERA & PLAY HAPTIC
            cameraStreamEl.pause();
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            
            // 2. SLIDE UP DETAILS CARD
            detailsCard.classList.add('active');
            captureScanBtn.style.display = 'none';
            scanLaser.style.display = 'none';
            
            // 3. DRAW DYNAMIC BOUNDING BOX
            try {
                // Determine rough bounding box from Tesseract's parsed word lines
                let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
                result.data.words.forEach(word => {
                    if (word.text.length >= 1) { // Any valid parsed block
                        if (word.bbox.x0 < minX) minX = word.bbox.x0;
                        if (word.bbox.y0 < minY) minY = word.bbox.y0;
                        if (word.bbox.x1 > maxX) maxX = word.bbox.x1;
                        if (word.bbox.y1 > maxY) maxY = word.bbox.y1;
                    }
                });
                
                // Fallback to safety if empty
                if (minX === Infinity && result.data.lines.length > 0) {
                    minX = result.data.lines[0].bbox.x0; minY = result.data.lines[0].bbox.y0;
                    maxX = result.data.lines[0].bbox.x1; maxY = result.data.lines[0].bbox.y1;
                }
                
                // Map the ROI coordinate system back out to the base cameraStream natively
                let oX = (minX - padding) / scale;
                let oY = (minY - padding) / scale;
                let oW = (maxX - minX) / scale;
                let oH = (maxY - minY) / scale;
                
                let vidX = oX + startX;
                let vidY = oY + startY;
                
                // Map native video coords to the absolute object-fit browser DOM coordinates
                const containerRect = cameraStreamEl.parentElement.getBoundingClientRect();
                const scaleDOM = Math.max(containerRect.width / vW, containerRect.height / vH);
                
                const visW = vW * scaleDOM;
                const visH = vH * scaleDOM;
                
                // Apply offsets for absolute center clipping via object-fit cover
                const offX = (containerRect.width - visW) / 2;
                const offY = (containerRect.height - visH) / 2;
                
                const domX = (vidX * scaleDOM) + offX;
                const domY = (vidY * scaleDOM) + offY;
                const domW = oW * scaleDOM;
                const domH = oH * scaleDOM;
                
                // Inject the actual DOM element targeting bracket
                const bboxDiv = document.createElement('div');
                bboxDiv.className = 'bounding-box';
                bboxDiv.style.left = `${domX - 10}px`; // Provide modest buffer padding
                bboxDiv.style.top = `${domY - 10}px`;
                bboxDiv.style.width = `${domW + 20}px`;
                bboxDiv.style.height = `${domH + 20}px`;
                
                cameraStreamEl.parentElement.appendChild(bboxDiv);
            } catch (e) { console.warn("Failed to frame bounding box:", e); }
        }
        
    } catch (err) {
        console.error("OCR API Error:", err);
        // Print the direct error message onto the UI so we can debug exactly what failed
        vehicleDataVal.innerHTML = `<span style='color:#E63946; font-size:11px;' title="${err.message || err.toString()}">Error: ${err.message || err.toString()}</span>`;
    } finally {
        vehicleDataItem.classList.remove('fetching');
        scanLaser.style.display = 'none';
        captureScanBtn.disabled = false;
        captureScanBtn.innerHTML = '<i data-lucide="scan"></i> Scan Plate';
        lucide.createIcons();
    }
});

// Setup Rescan routine from within the Card
rescanCardBtn.addEventListener('click', () => {
    // Drop the card
    detailsCard.classList.remove('active');
    
    // Resume pipeline execution visuals
    captureScanBtn.style.display = 'flex';
    scanLaser.style.display = 'block';
    
    // Purge drawn overlays and unfreeze feed
    document.querySelectorAll('.bounding-box').forEach(el => el.remove());
    cameraStreamEl.play();
});

/* =========================================
   SCREEN 4 LOGIC (NEARBY MAP — hospitals + police)
   ========================================= */
const mapScreen   = document.getElementById('mapScreen');
const navNearby   = document.getElementById('navNearby');
const closeMapBtn = document.getElementById('closeMapBtn');
const hospCard    = document.getElementById('hospCard');
const hospCountText = document.getElementById('hospCountText');

// Bottom-sheet elements
const hospNameEl   = document.getElementById('hospName');
const hospDistEl   = document.getElementById('hospDist');
const bsDriveTime  = document.getElementById('bsDriveTime');
const bsTypeBadge  = document.getElementById('bsTypeBadge');
const bsPhone      = document.getElementById('bsPhone');
const bsBeds       = document.getElementById('bsBeds');
const bedsCount    = document.getElementById('bedsCount');
const bsNavigateBtn= document.getElementById('bsNavigateBtn');
const bsCallBtn    = document.getElementById('bsCallBtn');

// Filter chips
const filterChips = document.querySelectorAll('.filter-chip');
let activeFilter = 'all';
let showPolice = false; // independent toggle
let showFuel = false;
let showTowing = false;
let layersFetched = { fuel: false, towing: false };

let nearbyMap;
let userMarker;
let hospitalLayerGroup;
let policeLayerGroup;
let fuelLayerGroup;
let towingLayerGroup;
let userLat = 28.6139, userLng = 77.2090; // Default to Delhi
let locationSource = 'fallback'; // 'gps', 'ip', 'fallback'
let currentCity = '', currentRegion = '';

function getDisplayLocation(forceRaw = false) {
    // If we have a high-accuracy street address from Nominatim, use that!
    if (!forceRaw && currentAddress) return currentAddress;
    
    // Fallback to City/Region
    if (!forceRaw && currentCity && currentRegion) return `${currentCity}, ${currentRegion}`;
    
    // Then raw GPS for emergency precision
    if (latestLat !== "Unknown" && latestLng !== "Unknown") return `${latestLat.toFixed(6)}, ${latestLng.toFixed(6)}`;
    
    return "Establishing context...";
}

// All fetched markers stored for filter toggling
let allHospMarkers  = [];  // { marker, type: 'govt'|'private'|'trauma' }
let allPoliceMarkers = []; // { marker }
let allFuelMarkers = [];
let allTowingMarkers = [];

navNearby.addEventListener('click', (e) => {
    e.preventDefault();
    standbyScreen.classList.remove('active');
    mapScreen.classList.add('active');
    initNearbyMap();
});

closeMapBtn.addEventListener('click', () => {
    mapScreen.classList.remove('active');
    standbyScreen.classList.add('active');
    hospCard.classList.remove('active');
});

// Dismiss sheet when tapping the map background
document.getElementById('map')?.addEventListener('click', () => {
    hospCard.classList.remove('active');
});

// Filter chip interactions
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        
        if (['police', 'fuel', 'towing'].includes(filter)) {
            // Toggle independently
            chip.classList.toggle('active');
            const isActive = chip.classList.contains('active');
            
            if (filter === 'police') showPolice = isActive;
            if (filter === 'fuel') showFuel = isActive;
            if (filter === 'towing') showTowing = isActive;

            // Fetch on demand if needed
            if (isActive && filter !== 'police' && !layersFetched[filter]) {
                fetchDynamicLayer(filter, userLat, userLng);
            }

            applyMapFilter();
            hospCard.classList.remove('active');
            return;
        }

        // Radio logic for hospital types
        filterChips.forEach(c => {
            if (!['police', 'fuel', 'towing'].includes(c.dataset.filter)) {
                c.classList.remove('active');
            }
        });
        chip.classList.add('active');
        activeFilter = filter;
        applyMapFilter();
        hospCard.classList.remove('active');
    });
});

function applyMapFilter() {
    // Clear both layers completely, then re-add only matching markers.
    // This avoids all Leaflet hasLayer / internal-ID edge cases.
    hospitalLayerGroup.clearLayers();
    allHospMarkers.forEach(({ marker, type }) => {
        if (activeFilter === 'all' || activeFilter === type) {
            marker.addTo(hospitalLayerGroup);
        }
    });

    policeLayerGroup.clearLayers();
    if (showPolice) allPoliceMarkers.forEach(({ marker }) => marker.addTo(policeLayerGroup));

    fuelLayerGroup.clearLayers();
    if (showFuel) allFuelMarkers.forEach(({ marker }) => marker.addTo(fuelLayerGroup));

    towingLayerGroup.clearLayers();
    if (showTowing) allTowingMarkers.forEach(({ marker }) => marker.addTo(towingLayerGroup));
}

const INDIAN_CITIES = {
    'Mumbai': [19.0760, 72.8777],
    'Delhi': [28.6139, 77.2090],
    'Bangalore': [12.9716, 77.5946],
    'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867],
    'Kozhikode': [11.2588, 75.7804],
    'Kochi': [9.9312, 76.2673],
    'Pune': [18.5204, 73.8567],
    'Kolkata': [22.5726, 88.3639],
    'Ahmedabad': [23.0225, 72.5714]
};

function initNearbyMap() {
    if (!nearbyMap) {
        nearbyMap = L.map('map', { zoomControl: false, attributionControl: false })
            .setView([userLat, userLng], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(nearbyMap);

        L.control.zoom({ position: 'bottomright' }).addTo(nearbyMap);

        hospitalLayerGroup = L.layerGroup().addTo(nearbyMap);
        policeLayerGroup   = L.layerGroup().addTo(nearbyMap);
        fuelLayerGroup     = L.layerGroup().addTo(nearbyMap);
        towingLayerGroup   = L.layerGroup().addTo(nearbyMap);

        nearbyMap.on('click', () => hospCard.classList.remove('active'));
    }

    // Start with a generic search state
    hospCountText.innerText = `Establishing location...`;
    updateNearbyMap(userLat, userLng);

    // Try IP lookup
    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
            if (locationSource !== 'gps' && data.latitude && data.longitude) {
                userLat = data.latitude;
                userLng = data.longitude;
                locationSource = 'ip';
                currentCity = data.city || 'Kozhikode';
                currentRegion = data.region || 'Kerala';
                hospCountText.innerText = `Location: ${currentCity}, ${currentRegion}`;
                updateNearbyMap(userLat, userLng);
            }
        })
        .catch(() => {});

    // Try GPS with High Accuracy
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                locationSource = 'gps';
                // Keep the city name from IP/Fallback if available, else generic location label
                const cityLabel = (typeof currentCity !== 'undefined') ? `${currentCity}, ${currentRegion}` : 'Live GPS Location';
                hospCountText.innerText = `Location: ${cityLabel}`;
                updateNearbyMap(userLat, userLng);
            },
            (err) => { 
                console.warn("GPS Access Denied or Timed Out:", err.message);
                // Subtitle already handled by IP/Fallback
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            }
        );
    }
}

async function updateNearbyMap(lat, lng) {
    const userPos = [lat, lng];
    nearbyMap.setView(userPos, 14);

    // User marker
    if (userMarker) {
        userMarker.setLatLng(userPos);
    } else {
        const userIcon = L.divIcon({
            className: 'user-marker-container',
            html: '<div class="user-marker-pulse"></div><div class="user-marker"></div>',
            iconSize: [24, 24], iconAnchor: [12, 12]
        });
        userMarker = L.marker(userPos, { icon: userIcon }).addTo(nearbyMap);
    }

    // hospitalLayerGroup.clearLayers();
    hospitalLayerGroup.clearLayers();
    policeLayerGroup.clearLayers();
    fuelLayerGroup.clearLayers();
    towingLayerGroup.clearLayers();
    
    allHospMarkers  = [];
    allPoliceMarkers = [];
    allFuelMarkers = [];
    allTowingMarkers = [];
    layersFetched = { fuel: false, towing: false };

    // Run both queries in parallel
    await Promise.all([
        fetchHospitals(lat, lng),
        fetchPolice(lat, lng)
    ]);

    applyMapFilter();
    lucide.createIcons();
}

/* ---------- hospital type heuristics ---------- */
function classifyHospital(tags) {
    const name    = (tags.name || '').toLowerCase();
    const op      = (tags.operator || '').toLowerCase();
    const opType  = (tags['operator:type'] || '').toLowerCase();
    const combined = name + ' ' + op + ' ' + opType;

    // Trauma / Casualty first (highest priority)
    if (tags.emergency === 'yes' || tags['emergency:room'] === 'yes' || tags.emergency_room === 'yes' || /trauma|casualty|accident & emergency|a&e|level.?1/.test(combined)) return 'trauma';

    // Government indicators
    const govtKeywords = [
        'government', 'govt', 'gvt', 'gov ',
        'district hospital', 'district general',
        'taluk hospital', 'sub district',
        'community health centre', 'chc',
        'primary health centre', 'phc',
        'general hospital',
        'medical college', 'mch',
        'esic', 'esi hospital', 'employees state insurance',
        'railway hospital', 'railwayboard',
        'army hospital', 'military hospital', 'naval hospital', 'air force hospital',
        'central hospital', 'public', 'municipal',
        'panchayat hospital',
        'gmch', 'jipmer', 'aiims',
        'national hospital',
        'cooperative hospital',
        'health centre',
    ];
    if (govtKeywords.some(kw => combined.includes(kw))) return 'govt';
    if (opType === 'government' || opType === 'public') return 'govt';

    return 'private';
}

function pinEmoji(type) {
    if (type === 'trauma')  return '⚡';
    if (type === 'govt')    return '🏥';
    if (type === 'police')  return '🛡';
    if (type === 'fuel')    return '⛽';
    if (type === 'towing')  return '🛻';
    return '+';
}

function makePinIcon(type) {
    return L.divIcon({
        className: '',
        html: `<div class="map-pin-icon">
                 <div class="map-pin-bubble ${type}">${pinEmoji(type)}</div>
                 <div class="map-pin-tail ${type}"></div>
               </div>`,
        iconSize: [34, 44],
        iconAnchor: [17, 44]
    });
}

/* ---------- global overpass fetch queue ---------- */
let overpassLock = Promise.resolve();
async function fetchWithOverpass(q) {
    return new Promise((resolve, reject) => {
        overpassLock = overpassLock.then(async () => {
            // Wait generous 800ms between calls to avoid strictly enforced Overpass IPs rate limiting
            await new Promise(r => setTimeout(r, 800));
            try {
                // Use POST to avoid long URL filtering, and url-encoded format for Overpass API
                let res = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(q)}`
                });
                
                // Fallback to secondary server if primary is completely exhausted/blocked
                if (!res.ok) {
                    res = await fetch('https://lz4.overpass-api.de/api/interpreter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `data=${encodeURIComponent(q)}`
                    });
                }

                if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                
                // Read text first to cleanly catch HTML error pages (Overpass 504 / Rate limits trick)
                const text = await res.text();
                if (text.trim().startsWith('<')) {
                    throw new Error('Overpass returned HTML instead of JSON: Rate Limit or Server Error.');
                }
                
                const data = JSON.parse(text);
                resolve(data);
            } catch (err) {
                console.error("Overpass Fetch execution failed:", err);
                reject(err);
            }
        });
    });
}

/* ---------- fetch hospitals ---------- */
async function fetchHospitals(lat, lng) {
    try {
        const q = `[out:json];(node["amenity"="hospital"](around:7000,${lat},${lng});way["amenity"="hospital"](around:7000,${lat},${lng}););out center;`;
        const data = await fetchWithOverpass(q);
        const hospitals = data.elements;

        hospitals.forEach(h => {
            const hLat = h.lat || (h.center && h.center.lat);
            const hLon = h.lon || (h.center && h.center.lon);
            if (!hLat || !hLon) return;

            const type = classifyHospital(h.tags);
            const name = h.tags.name || 'Emergency Medical Centre';
            const dist = calculateDistance(lat, lng, hLat, hLon);
            const driveMin = Math.round((dist / 40) * 60); // ~40 km/h average

            const beds = h.tags['capacity:beds'] || h.tags['beds'] || null;

            const marker = L.marker([hLat, hLon], { icon: makePinIcon(type) });
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                showBottomSheet({
                    kind: 'hospital', type,
                    name, dist: dist.toFixed(1), driveMin,
                    lat: hLat, lng: hLon, beds
                });
            });
            // Don't addTo map yet — applyMapFilter does it
            allHospMarkers.push({ marker, type });
        });

        const total = hospitals.length;
        hospCountText.innerText = `${total} facilities found nearby`;
    } catch (e) {
        console.error('Hospital fetch error:', e);
        hospCountText.innerText = 'Failed to load hospitals';
    }
}

/* ---------- fetch police stations ---------- */
async function fetchPolice(lat, lng) {
    try {
        const q = `[out:json];(node["amenity"="police"](around:7000,${lat},${lng});way["amenity"="police"](around:7000,${lat},${lng}););out center;`;
        const data = await fetchWithOverpass(q);

        data.elements.forEach(p => {
            const pLat = p.lat || (p.center && p.center.lat);
            const pLon = p.lon || (p.center && p.center.lon);
            if (!pLat || !pLon) return;

            const name  = p.tags.name || 'Police Station';
            const phone = p.tags['contact:phone'] || p.tags.phone || null;
            const dist  = calculateDistance(lat, lng, pLat, pLon);
            const driveMin = Math.round((dist / 40) * 60);

            const marker = L.marker([pLat, pLon], { icon: makePinIcon('police') });
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                showBottomSheet({
                    kind: 'police',
                    name, dist: dist.toFixed(1), driveMin,
                    phone, lat: pLat, lng: pLon
                });
            });
            allPoliceMarkers.push({ marker });
        });
    } catch (e) {
        console.error('Police fetch error:', e);
    }
}

/* ---------- fetch on-demand layers ---------- */
async function fetchDynamicLayer(type, lat, lng) {
    layersFetched[type] = true;
    hospCountText.innerText = `Fetching ${type}...`;
    
    let q = '';
    if (type === 'fuel') q = `[out:json];(node["amenity"="fuel"](around:5000,${lat},${lng});way["amenity"="fuel"](around:5000,${lat},${lng}););out center;`;
    if (type === 'towing') q = `[out:json];(node["service:vehicle:towing"="yes"](around:20000,${lat},${lng});node["craft"="towing"](around:20000,${lat},${lng});node["shop"="car_repair"](around:5000,${lat},${lng});node["shop"="motorcycle_repair"](around:5000,${lat},${lng}););out center;`;

    try {
        const data = await fetchWithOverpass(q);

        data.elements.forEach(p => {
            const pLat = p.lat || (p.center && p.center.lat);
            const pLon = p.lon || (p.center && p.center.lon);
            if (!pLat || !pLon) return;

            let name = p.tags.name || 'Service Provider';
            if (type === 'fuel') name = p.tags.name || 'Fuel Station';
            if (type === 'towing') name = p.tags.name || 'Towing Service';

            const phone = p.tags['contact:phone'] || p.tags.phone || null;
            const dist  = calculateDistance(lat, lng, pLat, pLon);
            const driveMin = Math.round((dist / 40) * 60);

            const marker = L.marker([pLat, pLon], { icon: makePinIcon(type) });
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                showBottomSheet({
                    kind: type,
                    name, dist: dist.toFixed(1), driveMin,
                    phone, lat: pLat, lng: pLon
                });
            });

            if (type === 'fuel') allFuelMarkers.push({ marker });
            if (type === 'towing') allTowingMarkers.push({ marker });
        });

        applyMapFilter();
        hospCountText.innerText = `Found ${data.elements.length} ${type} locations`;
        lucide.createIcons();
    } catch (e) {
        console.error(`Fetch error for ${type}:`, e);
        hospCountText.innerText = `Failed to fetch ${type}`;
    }
}

/* ---------- unified bottom sheet ---------- */
function showBottomSheet({ kind, type, name, dist, driveMin, phone, lat, lng, beds }) {
    hospNameEl.innerText = name;

    // Distance pill
    hospDistEl.innerHTML = `<i data-lucide="map-pin"></i> ${dist} km`;

    // Drive time pill
    bsDriveTime.innerHTML = `<i data-lucide="clock"></i> ~${driveMin} min`;

    // Type badge
    bsTypeBadge.className = 'bs-type-badge';
    if (['police', 'fuel', 'towing'].includes(kind)) {
        bsTypeBadge.classList.add(kind);
        const kindLabels = { police: 'Police Station', fuel: 'Fuel Station', towing: 'Towing Service' };
        bsTypeBadge.innerText = kindLabels[kind];
    } else {
        const labels = { govt: 'Government Hospital', private: 'Private Hospital', trauma: 'Trauma Centre' };
        bsTypeBadge.classList.add(type);
        bsTypeBadge.innerText = labels[type] || 'Hospital';
    }

    // Phone pill
    if (['police', 'towing', 'fuel'].includes(kind) && phone) {
        bsPhone.innerHTML = `<i data-lucide="phone"></i> ${phone}`;
        bsPhone.style.display = 'flex';
    } else {
        bsPhone.style.display = 'none';
    }

    // Beds pill (hospitals only, if available)
    if (kind === 'hospital' && beds) {
        bedsCount.innerText = `${beds} beds`;
        bsBeds.style.display = 'flex';
    } else {
        bsBeds.style.display = 'none';
    }

    // Navigate button (Google Maps directions)
    bsNavigateBtn.className = 'bs-btn bs-btn--navigate' + (kind === 'police' ? ' police-nav' : '');
    bsNavigateBtn.innerHTML = '<i data-lucide="navigation"></i> Navigate';
    bsNavigateBtn.onclick = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        window.open(url, '_blank');
    };

    // Call button
    bsCallBtn.className = 'bs-btn bs-btn--call' + (kind === 'police' ? ' police-call' : '');
    if (['police', 'towing', 'fuel'].includes(kind)) {
        let defaultCall = '100';
        if (['towing', 'fuel'].includes(kind)) defaultCall = phone || '103'; 
        
        if (!phone && kind !== 'police') {
            bsCallBtn.style.display = 'none';
        } else {
            bsCallBtn.style.display = 'flex';
            const callNum = (phone || defaultCall).replace(/[^0-9+]/g, '') || defaultCall;
            bsCallBtn.innerHTML = `<i data-lucide="phone"></i> Call ${phone ? phone : defaultCall}`;
            bsCallBtn.onclick = () => { window.location.href = `tel:${callNum}`; };
        }
    } else {
        bsCallBtn.style.display = 'flex';
        bsCallBtn.innerHTML = '<i data-lucide="phone"></i> Call 104';
        bsCallBtn.onclick = () => { window.location.href = 'tel:104'; };
    }

    hospCard.classList.add('active');
    lucide.createIcons();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}


/* =========================================
   SCREEN 5 LOGIC (MEDICAL ID & QR)
   ========================================= */
navProfile.addEventListener('click', (e) => {
    e.preventDefault();
    standbyScreen.classList.remove('active');
    medicalIdScreen.classList.add('active');
    loadMedicalId();
});

closeProfileBtn.addEventListener('click', () => {
    medicalIdScreen.classList.remove('active');
    standbyScreen.classList.add('active');
});

function loadMedicalId() {
    const savedData = localStorage.getItem('medicalId');
    if (savedData) {
        const data = JSON.parse(savedData);
        Object.keys(data).forEach(key => {
            const input = medicalIdForm.elements[key];
            if (input) input.value = data[key];
        });
    }
    generateMedicalQR();
}

function saveMedicalId() {
    const formData = new FormData(medicalIdForm);
    const data = Object.fromEntries(formData.entries());
    localStorage.setItem('medicalId', JSON.stringify(data));
    generateMedicalQR();
}

// Save on every input change
medicalIdForm.addEventListener('input', saveMedicalId);

function generateMedicalQR() {
    const formData = new FormData(medicalIdForm);
    const data = Object.fromEntries(formData.entries());
    
    // Create a compact string for the QR code
    const qrText = `MEDICAL ID\nName: ${data.name || "N/A"}\nBlood: ${data.bloodGroup || "N/A"}\nAllergies: ${data.allergies || "None"}\nContact: ${data.contactPhone || "N/A"}`;
    
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    qrContainer.innerHTML = ''; // Clear previous
    
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: qrText,
            width: 160,
            height: 160,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

medicalIdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveMedicalId();
    
    // Visual feedback
    saveProfileBtn.classList.add('success');
    saveBtnText.innerText = 'Profile Saved';
    saveCheckIcon.style.display = 'block';
    lucide.createIcons();
    
    setTimeout(() => {
        saveProfileBtn.classList.remove('success');
        saveBtnText.innerText = 'Save Profile';
        saveCheckIcon.style.display = 'none';
        lucide.createIcons();
    }, 2000);
});

/* =========================================
   SCREEN 6 LOGIC (INCIDENT HISTORY)
   ========================================= */
navHistory.addEventListener('click', (e) => {
    e.preventDefault();
    standbyScreen.classList.remove('active');
    historyScreen.classList.add('active');
    renderHistory();
});

closeHistoryBtn.addEventListener('click', () => {
    historyScreen.classList.remove('active');
    standbyScreen.classList.add('active');
});

function saveIncident(incident) {
    if (DEMO_MODE) return; // Do not log during demo
    let history = JSON.parse(localStorage.getItem('incidentHistory') || '[]');
    history.unshift(incident); // Add to top
    localStorage.setItem('incidentHistory', JSON.stringify(history));
}

const HARDCODED_HISTORY = [
  {
    id: 1,
    datetime: "17/4/2026, 9:45:00 pm",
    location: "NH 66, Kozhikode",
    status: "RESOLVED",
    severity: "CRITICAL"
  },
  {
    id: 2,
    datetime: "16/4/2026, 8:20:00 pm",
    location: "Palayam Junction, Kozhikode",
    status: "RESOLVED",
    severity: "MODERATE"
  },
  {
    id: 3,
    datetime: "15/4/2026, 6:10:00 pm",
    location: "Bypass Road, Calicut",
    status: "CANCELLED",
    severity: "MINOR"
  },
  {
    id: 4,
    datetime: "14/4/2026, 11:30:00 am",
    location: "Mavoor Road, Kozhikode",
    status: "RESOLVED",
    severity: "MODERATE"
  },
  {
    id: 5,
    datetime: "13/4/2026, 3:15:00 pm",
    location: "SM Street, Kozhikode",
    status: "CANCELLED",
    severity: "MINOR"
  },
  {
    id: 6,
    datetime: "12/4/2026, 7:55:00 pm",
    location: "Medical College Road, Kozhikode",
    status: "RESOLVED",
    severity: "CRITICAL"
  },
  {
    id: 7,
    datetime: "11/4/2026, 2:40:00 pm",
    location: "Kannur Road, Kozhikode",
    status: "PENDING",
    severity: "MODERATE"
  }
];

function renderHistory() {
    let dynamicHistory = JSON.parse(localStorage.getItem('incidentHistory') || '[]');
    
    // Safety Filter: Remove any stale entries from previous sessions that contain "Locating..." or are invalid
    dynamicHistory = dynamicHistory.filter(item => {
        const loc = item.location ? item.location.toLowerCase() : '';
        return loc && !loc.includes('locating via gps') && !loc.includes('gps unavailable');
    });

    // Combine newest dynamic incidents at the top, then show the hardcoded logs
    const history = [...dynamicHistory, ...HARDCODED_HISTORY];
    
    if (history.length === 0) {
        historyEmptyState.style.display = 'flex';
        historyList.innerHTML = '';
        return;
    }

    historyEmptyState.style.display = 'none';
    historyList.innerHTML = '';

    history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        
        itemEl.innerHTML = `
            <div class="history-summary">
                <div class="history-main-info">
                    <span class="history-date">${item.datetime}</span>
                    <span class="history-loc">${item.location}</span>
                </div>
                <div class="history-status-group">
                    <div class="status-badge ${item.status.toLowerCase()}">${item.status}</div>
                    <div class="severity-pill ${item.severity.toLowerCase()}">${item.severity}</div>
                </div>
            </div>
        `;
        historyList.appendChild(itemEl);
    });
    
    lucide.createIcons();
}


