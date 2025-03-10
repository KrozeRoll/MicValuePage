document.addEventListener("DOMContentLoaded", async () => {
    const colorPicker = document.getElementById("colorPicker");
    const sensitivityRange = document.getElementById("sensitivityRange");
    const sensitivityValue = document.getElementById("sensitivityValue");
    let selectedColor = localStorage.getItem("selectedColor") || "white";

    function updateSelectedColor(color) {
        selectedColor = color;
        localStorage.setItem("selectedColor", color);
        document.querySelectorAll(".color-option").forEach(el => el.classList.remove("selected"));
        document.querySelector(`.color-option[data-color='${color}']`).classList.add("selected");
    }

    colorPicker.addEventListener("click", (event) => {
        if (event.target.classList.contains("color-option")) {
            updateSelectedColor(event.target.dataset.color);
        }
    });

    document.querySelectorAll(".color-option").forEach(el => {
        if (el.dataset.color === selectedColor) {
            el.classList.add("selected");
        }
    });

    sensitivityRange.addEventListener("input", () => {
        sensitivityValue.innerText = sensitivityRange.value;
    });

    async function setupMicrophone() {
        try {
            // Check microphone permissions
            const permissions = await navigator.permissions.query({ name: "microphone" });

            if (permissions.state === "denied") {
                alert("Microphone access is denied. Please allow it in your browser settings.");
                return;
            }

            // Request microphone access
            const constraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            startAnalyzing(stream);
        } catch (error) {
            console.error("Microphone access error:", error);
            alert("Failed to access the microphone. Please check your settings and try again.");
        }
    }

    function startAnalyzing(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let smoothVolume = 0;

        // Automatically resume AudioContext if blocked
        document.addEventListener("click", () => {
            if (audioContext.state === "suspended") {
                audioContext.resume();
            }
        });

        function updateVolume() {
            analyser.getByteFrequencyData(dataArray);
            let sum = dataArray.reduce((a, b) => a + b, 0);
            let average = sum / bufferLength;

            let sensitivityFactor = parseFloat(sensitivityRange.value);
            let volumePercentage = Math.min(100, (average / 255) * 100 * sensitivityFactor);

            smoothVolume = smoothVolume * 0.9 + volumePercentage * 0.1;

            let baseColor;
            switch (selectedColor) {
                case "yellow": baseColor = { r: 255, g: 255, b: 100 }; break;
                case "green": baseColor = { r: 100, g: 255, b: 100 }; break;
                case "blue": baseColor = { r: 100, g: 100, b: 255 }; break;
                case "red": baseColor = { r: 255, g: 100, b: 100 }; break;
                case "purple": baseColor = { r: 150, g: 100, b: 255 }; break;
                case "cyan": baseColor = { r: 100, g: 255, b: 255 }; break;
                case "pink": baseColor = { r: 255, g: 192, b: 203 }; break;
                default: baseColor = { r: 255, g: 255, b: 255 };
            }

            let brightnessFactor = 50 + (smoothVolume / 100) * (255 - 50);
            let finalColor = `rgb(
                ${Math.round((baseColor.r / 255) * brightnessFactor)}, 
                ${Math.round((baseColor.g / 255) * brightnessFactor)}, 
                ${Math.round((baseColor.b / 255) * brightnessFactor)}
            )`;

            document.body.style.backgroundColor = finalColor;
            document.getElementById("volumeValue").innerText = Math.round(smoothVolume) + "%";

            requestAnimationFrame(updateVolume);
        }

        updateVolume();
    }

    setupMicrophone();
});
