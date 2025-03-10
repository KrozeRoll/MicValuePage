// Функция линейной интерполяции для плавного изменения значений
function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

async function setupMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let smoothVolume = 0;
        const sensitivityRange = document.getElementById("sensitivityRange");
        const sensitivityValue = document.getElementById("sensitivityValue");
        const colorPicker = document.getElementById("colorPicker");

        let selectedColor = localStorage.getItem("selectedColor") || "white";

        // Функция обновления выбранного цвета
        function updateSelectedColor(color) {
            selectedColor = color;
            localStorage.setItem("selectedColor", color);
            document.querySelectorAll(".color-option").forEach(el => el.classList.remove("selected"));
            document.querySelector(`.color-option[data-color='${color}']`).classList.add("selected");
        }

        // Обработчик клика по цветовым кнопкам
        colorPicker.addEventListener("click", (event) => {
            if (event.target.classList.contains("color-option")) {
                updateSelectedColor(event.target.dataset.color);
            }
        });

        // Устанавливаем выделение для сохранённого цвета
        document.querySelectorAll(".color-option").forEach(el => {
            if (el.dataset.color === selectedColor) {
                el.classList.add("selected");
            }
        });

        // Обновляем чувствительность
        sensitivityRange.addEventListener("input", () => {
            sensitivityValue.innerText = sensitivityRange.value;
        });

        function updateVolume() {
            analyser.getByteFrequencyData(dataArray);
            let sum = dataArray.reduce((a, b) => a + b, 0);
            let average = sum / bufferLength;

            // Получаем значение чувствительности
            let sensitivityFactor = parseFloat(sensitivityRange.value);
            let volumePercentage = Math.min(100, (average / 255) * 100 * sensitivityFactor);

            // Применяем сглаживание
            smoothVolume = lerp(smoothVolume, volumePercentage, 0.1);

            // Определяем цвет
            let baseColor;
            switch (selectedColor) {
                case "yellow":
                    baseColor = { r: 255, g: 255, b: 100 };
                    break;
                case "green":
                    baseColor = { r: 100, g: 255, b: 100 };
                    break;
                case "blue":
                    baseColor = { r: 100, g: 100, b: 255 };
                    break;
                case "red":
                    baseColor = { r: 255, g: 100, b: 100 };
                    break;
                case "purple":
                    baseColor = { r: 150, g: 100, b: 255 };
                    break;
                case "cyan":
                    baseColor = { r: 100, g: 255, b: 255 };
                    break;
                default:
                    baseColor = { r: 255, g: 255, b: 255 };
            }

            // Рассчитываем яркость
            let brightnessFactor = 5 + (smoothVolume / 100) * (255 - 5);
            let finalColor = `rgb(
                ${Math.round((baseColor.r / 255) * brightnessFactor)}, 
                ${Math.round((baseColor.g / 255) * brightnessFactor)}, 
                ${Math.round((baseColor.b / 255) * brightnessFactor)}
            )`;

            // Применяем цвет фона
            document.body.style.backgroundColor = finalColor;

            document.getElementById("volumeValue").innerText = Math.round(smoothVolume) + "%";
            requestAnimationFrame(updateVolume);
        }

        updateVolume();
    } catch (error) {
        alert("Ошибка доступа к микрофону: " + error.message);
    }
}

setupMicrophone();
