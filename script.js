document.addEventListener("DOMContentLoaded", async () => {
    const colorPicker = document.getElementById("colorPicker");
    const sensitivityRange = document.getElementById("sensitivityRange");
    const sensitivityValue = document.getElementById("sensitivityValue");

    let savedSensitivity = localStorage.getItem("sensitivity") || "10";
    let selectedColor = localStorage.getItem("selectedColor") || "white";

    // Colors list
    const colors = [
        { name: "white", rgb: { r: 255, g: 255, b: 255 } },
        { name: "yellow", rgb: { r: 255, g: 255, b: 100 } },
        { name: "green", rgb: { r: 100, g: 255, b: 100 } },
        { name: "blue", rgb: { r: 100, g: 100, b: 255 } },
        { name: "red", rgb: { r: 255, g: 100, b: 100 } },
        { name: "purple", rgb: { r: 150, g: 100, b: 255 } },
        { name: "cyan", rgb: { r: 100, g: 255, b: 255 } },
        { name: "pink", rgb: { r: 255, g: 192, b: 203 } }, 
        { name: "orange", rgb: { r: 255, g: 200, b: 100 } }
    ];

    // Color picker buttons
    colorPicker.innerHTML = colors.map(color =>
        `<div class="color-option" data-color="${color.name}" style="background-color: rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b});"></div>`
    ).join("\n");

    sensitivityRange.value = savedSensitivity;
    sensitivityValue.innerText = savedSensitivity;

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
        let newValue = sensitivityRange.value;
        sensitivityValue.innerText = newValue;
        localStorage.setItem("sensitivity", newValue);
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

            let baseColor = colors.find(c => c.name === selectedColor)?.rgb || { r: 255, g: 255, b: 255 };

            const startbrightness = 20;
            let brightnessFactor = startbrightness + (smoothVolume / 100) * (255 - startbrightness);
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
