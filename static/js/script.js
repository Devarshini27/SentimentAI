
const textInput = document.getElementById("textInput");
const analyzeButton = document.getElementById("analyzeButton");
const buttonText = document.getElementById("buttonText");
const loadingState = document.getElementById("loadingState");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("resultSection");

let sentimentChart = null;

let counts = {
    Positive: 0,
    Negative: 0,
    Neutral: 0
};

const emojis = {
    Positive: "😊",
    Negative: "😞",
    Neutral: "😐"
};

const descriptions = {
    Positive: "Your text expresses a positive sentiment!",
    Negative: "Your text expresses a negative sentiment.",
    Neutral: "Your text expresses a neutral sentiment."
};


// Character counter
textInput.addEventListener("input", () => {
    document.getElementById("charCount").textContent =
        `${textInput.value.length} / 2000 characters`;
});


// Example buttons
document.querySelectorAll(".example-chip").forEach(button => {
    button.addEventListener("click", () => {
        textInput.value = button.dataset.text;
        textInput.dispatchEvent(new Event("input"));
        textInput.focus();
    });
});


// Clear input
document.getElementById("clearInput").addEventListener("click", () => {
    textInput.value = "";
    textInput.dispatchEvent(new Event("input"));
    hideError();
});


// Error display
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}


// Analyze text
analyzeButton.addEventListener("click", analyzeText);

async function analyzeText() {

    const text = textInput.value.trim();

    hideError();

    if (!text) {
        showError("Please enter some text before analyzing.");
        return;
    }

    if (text.length > 2000) {
        showError("Please enter text under 2000 characters.");
        return;
    }

    analyzeButton.disabled = true;
    loadingState.classList.remove("hidden");
    buttonText.textContent = "Analyzing...";

    try {

        const response = await fetch("/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Something went wrong.");
        }

        displayResult(data);

        await loadHistory();

        resultSection.classList.remove("hidden");

        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        showError(error.message || "Unable to connect to the server.");
    } finally {
        analyzeButton.disabled = false;
        loadingState.classList.add("hidden");
        buttonText.textContent = "Analyze Sentiment";
    }
}


// Display prediction
function displayResult(data) {

    const sentiment = data.sentiment;
    const confidence = Number(data.confidence);

    document.getElementById("resultEmoji").textContent =
        emojis[sentiment] || "✨";

    document.getElementById("sentimentResult").textContent =
        sentiment;

    document.getElementById("resultDescription").textContent =
        descriptions[sentiment] || "Sentiment prediction completed.";

    document.getElementById("analyzedText").textContent =
        data.text;

    const pill = document.getElementById("sentimentPill");

    pill.textContent = sentiment.toUpperCase();
    pill.className = `sentiment-pill ${sentiment.toLowerCase()}`;

    document.getElementById("confidenceValue").textContent =
        confidence.toFixed(2) + "%";

    const circle = document.getElementById("confidenceCircle");

    circle.style.background =
        `conic-gradient(#a184ff ${confidence}%, #35334d ${confidence}%)`;
}


// Load history
async function loadHistory() {

    try {

        const response = await fetch("/history");

        if (!response.ok) {
            throw new Error("Could not load history");
        }

        const history = await response.json();

        renderHistory(history);
        updateStatistics(history);
        updateChart(history);

    } catch (error) {
        console.error("History error:", error);
    }
}


// Render history
function renderHistory(history) {

    const historyList = document.getElementById("historyList");

    historyList.replaceChildren();

    if (!history.length) {

        const empty = document.createElement("div");
        empty.className = "empty-history";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "⌁";

        const heading = document.createElement("h3");
        heading.textContent = "No analysis yet";

        const paragraph = document.createElement("p");
        paragraph.textContent =
            "Your recent analyses will appear here.";

        empty.append(icon, heading, paragraph);
        historyList.appendChild(empty);

        return;
    }

    history.forEach(item => {

        const row = document.createElement("div");
        row.className = "history-item";

        const textBox = document.createElement("div");
        textBox.className = "history-text";

        const text = document.createElement("p");
        text.textContent = item.text;

        const time = document.createElement("small");
        time.textContent =
            `${item.time} · ${Number(item.confidence).toFixed(2)}% confidence`;

        textBox.append(text, time);

        const badge = document.createElement("span");
        badge.className =
            `history-result ${String(item.sentiment).toLowerCase()}`;

        badge.textContent =
            `${emojis[item.sentiment] || "✨"} ${item.sentiment}`;

        row.append(textBox, badge);
        historyList.appendChild(row);
    });
}


// Update statistics
function updateStatistics(history) {

    counts = {
        Positive: 0,
        Negative: 0,
        Neutral: 0
    };

    history.forEach(item => {
        if (Object.hasOwn(counts, item.sentiment)) {
            counts[item.sentiment]++;
        }
    });

    document.getElementById("totalAnalyses").textContent =
        history.length;

    document.getElementById("positiveCount").textContent =
        counts.Positive;

    document.getElementById("negativeCount").textContent =
        counts.Negative;

    document.getElementById("neutralCount").textContent =
        counts.Neutral;
}


// Create analytics chart
function updateChart(history) {

    const chartCanvas = document.getElementById("sentimentChart");
    const chartEmpty = document.getElementById("chartEmpty");

    if (sentimentChart) {
        sentimentChart.destroy();
        sentimentChart = null;
    }

    if (history.length === 0) {
        chartEmpty.classList.remove("hidden");
        chartCanvas.style.display = "none";
        return;
    }

    chartEmpty.classList.add("hidden");
    chartCanvas.style.display = "block";

    sentimentChart = new Chart(chartCanvas, {

        type: "doughnut",

        data: {
            labels: ["Positive", "Negative", "Neutral"],

            datasets: [{
                data: [
                    counts.Positive,
                    counts.Negative,
                    counts.Neutral
                ],

                backgroundColor: [
                    "#65dda0",
                    "#ff748b",
                    "#729cff"
                ],

                borderColor: "#15182b",
                borderWidth: 5,
                hoverOffset: 12
            }]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            cutout: "70%",

            plugins: {

                legend: {
                    position: "bottom",

                    labels: {
                        color: "#bfc2d7",
                        padding: 22,
                        usePointStyle: true,
                        pointStyle: "circle",
                        font: {
                            family: "DM Sans",
                            size: 12
                        }
                    }
                },

                tooltip: {
                    backgroundColor: "#22243c",
                    titleColor: "#ffffff",
                    bodyColor: "#c8c8dc",
                    padding: 13,
                    cornerRadius: 10
                }
            },

            animation: {
                animateRotate: true,
                duration: 1000
            }
        }
    });
}


// Clear history
document.getElementById("clearHistory").addEventListener(
    "click",
    async () => {

        if (!confirm("Are you sure you want to clear your analysis history?")) {
            return;
        }

        try {

            const response = await fetch("/clear-history", {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error("Unable to clear history.");
            }

            await loadHistory();

            resultSection.classList.add("hidden");

        } catch (error) {
            showError(error.message);
        }
    }
);


// Analyze another text
document.getElementById("analyzeAgain").addEventListener(
    "click",
    () => {

        resultSection.classList.add("hidden");

        textInput.value = "";
        textInput.dispatchEvent(new Event("input"));

        textInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        textInput.focus();
    }
);


// Load saved session history on page opening
document.addEventListener("DOMContentLoaded", loadHistory);
