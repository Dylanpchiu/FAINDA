//This needed to be done
let availableKeywords = [];

fetch("anime-names.csv")
    .then(response => response.text())
    .then(csvData => {
        // Split the CSV data into individual lines
        var lines = csvData.split('\n');

        // Specify the custom delimiter
        var delimiter = '|';

        // Process each line to extract the elements
        var extractedElements = [];
        lines.forEach(line => {
            var elements = line.split(delimiter);

            // Process each element to handle quotes
            elements.forEach(element => {
                var trimmedElement = element.trim();

                // Check if the element is surrounded by double quotes
                if (trimmedElement.startsWith('"') && trimmedElement.endsWith('"')) {
                    // Remove the surrounding quotes and add the element
                    var extractedElement = trimmedElement.slice(1, -1);
                    extractedElements.push(extractedElement);
                } else {
                    // Add the element as is
                    extractedElements.push(trimmedElement);
                }
            });
        });

        availableKeywords = extractedElements;
    })
    .catch(error => console.log("Error:", error));





const resultsBox = document.querySelector(".result-box");
const inputBox = document.getElementById("anime-name");

inputBox.onkeyup = function() {
    let result = [];
    let input = inputBox.value;
    if(input.length) {
        result = availableKeywords.filter((keyword) => {
          return  keyword.toLowerCase().includes(input.toLowerCase());
        });
        // console.log(result);
    }
    display(result);

    if(!result.length) {
        resultsBox.innerHTML = '';
    }
}

function display(result) {
    const content = result.map((list) =>{
        return "<li onclick=selectInput(this)>" + list + "</li>";
    });

    resultsBox.innerHTML = "<ul>" + content.join('') + "</ul>";
}

function selectInput(list) {
    inputBox.value = list.innerHTML;
    resultsBox.innerHTML = '';
}

