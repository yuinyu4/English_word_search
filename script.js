let pdfDoc = null;

document.getElementById('pdfInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            alert("PDF 로드 완료!");
        });
    };

    reader.readAsArrayBuffer(file);
});

async function processPDF() {
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    const wordList = document.getElementById("wordList");
    wordList.innerHTML = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        detectPink(imageData, ctx);

        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
            const text = item.str;

            if (/^[a-zA-Z]+$/.test(text)) {
                addWord(text);
            }
        });
    }
}

function detectPink(imageData, ctx) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        if (r > 200 && g < 120 && b > 200) {
            data[i] = 255;
            data[i+1] = 0;
            data[i+2] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function addWord(word) {
    const li = document.createElement("li");
    li.innerText = word + " (불러오는 중...)";
    document.getElementById("wordList").appendChild(li);

    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
        .then(res => res.json())
        .then(data => {
            if (data[0]) {
                const meaning = data[0].meanings[0].definitions[0].definition;
                li.innerText = `${word} - ${meaning}`;
            }
        })
        .catch(() => {
            li.innerText = `${word} - 뜻 없음`;
        });
}
