"use-strict";

let userData = [];
let animeData = [];
let inputUserData = [];
let ratingVector = [];
let inputData = [];
let recommendations = [];
let recommendationsID = [];
let IDCheck = [];
let count = 0;
let buttonAdd = document.getElementById('search-button');
let buttonFilter = document.getElementById("filter");

///////////////////////////////////////////INITIALIZATION///////////////////////////////////////////////////////////////
fetch("anime-filtered.csv.gz")
    .then(response => response.arrayBuffer())
    .then(buffer => {
        const compressedDataAnime = new Uint8Array(buffer);
        const decompressedDataAnime = pako.inflate(compressedDataAnime, { to: "string" });
        // Process the decompressed CSV data
        const parsedDataAnime = Papa.parse(decompressedDataAnime).data;
        animeData = parsedDataAnime;
    })
    .catch(error => console.log("Error:", error));


fetch("user-filtered-updated.csv.gz")
    .then(response => response.arrayBuffer())
    .then(buffer => {
        const compressedDataUser = new Uint8Array(buffer);
        const decompressedDataUser = pako.inflate(compressedDataUser, { to: "string" });
        // Process the decompressed CSV data
        const parsedDataUser = Papa.parse(decompressedDataUser).data;
        userData = parsedDataUser;
    })
    .catch(error => console.log("Error:", error));

///////////////////////////////////////////BUTTONS/////////////////////////////////////////////////////////////////////

buttonAdd.addEventListener('click', function() {
    let animeID = getAnimeID();
    // console.log(animeID);
    // console.log(IDCheck);
    if (IDCheck.includes(animeID.toString())) {
        // console.log("same anime");

        var popupContainer = document.getElementById("popupContainer");
        popupContainer.classList.add("show-popup");

        setTimeout(function() {
            popupContainer.classList.remove("show-popup");
        }, 2000);

        return;
    }
    inputData = [-1, animeID, document.getElementById("rate").value];

    if (inputData[1]) {
        IDCheck.push(animeID);
        // console.log(IDCheck);
        inputUserData.push(inputData);

            var animeName = document.getElementById('anime-name').value;
            var rate = document.getElementById('rate').value;

            var newListItem = document.createElement("li");
            newListItem.textContent = animeName + " RATED:   " + rate.toString();

            var displayList = document.getElementById("displayList");
            displayList.appendChild(newListItem);
    }
})

//filter button
buttonFilter.addEventListener("click", function() {
    let recommendationDoc = document.getElementById("recommendations");
    let sortBy = document.getElementById("sort").value;
    let paragraph = document.createElement("p");
    paragraph.className = "indexParagraph"

    if (sortBy === "TopRanked") {
        recommendations = recommendShows(sortBy)
        paragraph.textContent = "TOP RANKED";

    } else if (sortBy === "HiddenGems") {
        recommendations = recommendShows(sortBy)
        paragraph.textContent = "HIDDEN GEMS";
    } else {
        recommendations = recommendShows(sortBy);
        paragraph.textContent = "HIGHEST SCORE"
    }
    let imageContainer = document.getElementById("imageContainer");

    if(count !== 0) {
        imageContainer.appendChild(paragraph);
    }else {
        recommendationDoc.appendChild(paragraph);

    }
    fetchAnimeImages(recommendationsID);
    recommendationsID = [];
    recommendations = [];
    IDCheck = [];
    // inputUserData = [];
    ratingVector = [];
    count++;
})


//fetches AnimeID given the name
function getAnimeID() {
    let animeName = document.getElementById("anime-name").value;

    for (let i = 1; i < animeData.length; i++) {

        if (animeData[i][1] === animeName) {
            return animeData[i][0];
        } else {
            // console.log("Not This anime!!");
        }
    }

        var popupContainer2 = document.getElementById("popupContainer2");
        popupContainer2.classList.add("show-popup");

        setTimeout(function() {
            popupContainer2.classList.remove("show-popup");
        }, 2000);


    var popupContainer = document.getElementById("popupContainer");
    popupContainer.classList.add("show-popup");

    setTimeout(function() {
        popupContainer.classList.remove("show-popup");
    }, 2000);

    return;

    throw new Error("No anime with this name!!");

}

function getMetaData(animeIDList, num) {
    let animeMetaDataSorted = [];

    for (let i = 0; i < animeIDList.length; i++) {
        for (let j = 0; j < animeData.length; j++) {

            if(animeData[j][0] === animeIDList[i]) {

                animeMetaDataSorted.push(animeData[j][num]);
            }
        }
    }

    if (num === 17) {
        animeMetaDataSorted.sort(((a,b) => a - b)); //Anime Ranking
    } else if (num === 18) {
        animeMetaDataSorted.sort(((a,b) => b-a)); // Anime Popularity
    } else {
        animeMetaDataSorted.sort(((a,b) => b - a)); //Anime score
    }
    console.log(animeMetaDataSorted);
    return animeMetaDataSorted.slice(0,5);
}

//adjusted cosine similarity to factor in if the input have more shows rated in common
//vecA is the input Data and vecB is the Other users Data
function cosineSimilarity(vecA, vecB) {
    if (vecA.length != vecB.length) {
        throw new Error("Vectors must have the same length");
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let commonItems = 0;

    for (let i = 0; i < vecA.length; i++) {
        if (vecA[i] !== 0 && vecB[0] !== 0) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
            commonItems++;
        }
    }
    //probably wont need this because I will likely handle this in simlar
    //but leave it here for now idk
    if (commonItems === 0) {
        return 0;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    return (dotProduct / (normA * normB)) * (commonItems / vecA.length);
}

function filter(userData,n ,k) {

    let userX = [];
    for (let i = n; i < k + 1; i++) {
        userX.push(userData[i]);
    }
    return userX;
}

function createVector(inputUserData, userData, n, k) {
    let userDataArray = filter(userData, n, k);
    let vector = [];
    let flag = true;
    for (let i = 0; i < inputUserData.length; i++) {
        for (let j = 0; j < userDataArray.length; j++) {
            if (inputUserData[i][1] === userDataArray[j][1]) {
                vector.push(userDataArray[j][2]);
                flag = false;
                break;
            }
        }
        if (flag) {
            vector.push(0);
        }
        flag = true;
    }
    return vector;
}

function inputUserDataVector(inputUserData) {
    for (let i = 0; i < inputUserData.length; i++) {
        ratingVector.push(inputUserData[i][2]);
    }
    return ratingVector;
}

function similarityFilter() {
    let n = 0;
    let k = 0;
    let start = userData[0][0]; // userID for userData bank
    let similarityList = [];
    let max = 0;
    let inputVector = inputUserDataVector(inputUserData);
    let similarity = {"similarityNum": 0, "start": 0, "end": 0};
    for(let i = 0; i < userData.length; i++) {

        if(start !== userData[i][0]) {
            start = userData[i][0];
            k = i - 1;
            similarity = [(cosineSimilarity(inputVector, createVector(inputUserData, userData, n, k))), n, k];
            // console.log("User #:" + start);
            let temp = similarity[0];

            if (temp > max) {

                // console.log(userData[i][0] + "# " + "sim # = " + temp);
                max = temp;
                similarityList = [];
                similarityList.push(similarity);

            } else if (temp === max) {
                similarityList.push(similarity);
            }
            n = i;
        }
    }
    return similarityList;
}

function findHighestRatedFromUser() {
    let similarityList = similarityFilter(inputUserData, userData);
    let start = 0;
    let end = 0;
    let recommendedArray = [];


    //for loop in-case there are two similarly rated users most likely will be 1 user
    for (let i = 0; i < similarityList.length; i++) {
        start = similarityList[i][1];
        end = similarityList[i][2];
        let max = 0;
        for (let j = start; j <= end; j++) {
            //bitch ass stupid javascript "10" > "8" = false
            if (Number(userData[j][2]) > max) {
                max = userData[j][2];
                recommendedArray = [];
                recommendedArray.push(userData[j][1]);
                // console.log(recommendedArray);
            } else if (userData[j][2] === max) {
                recommendedArray.push(userData[j][1]);
                // console.log(recommendedArray);
            }
        }
    }
    //remove from recommendation the same items that were inputted by the user
    for(let i = 0; i < inputUserData.length; i++) {
        if (recommendedArray.includes(inputUserData[i][1])) {
            recommendedArray = recommendedArray.filter(function(e) {
                return e !== inputUserData[i][1];
            })
        }
    }
    return recommendedArray; //an array of highest rated animeID from recommended user
}


function recommendShows(type) {
    let recommendedArray = findHighestRatedFromUser();

    let num = 0;
    if (type === "TopRanked") {
        num = 17;
    } else if (type === "HiddenGems") {
        num = 18
    } else {
        num = 2; // SCORE
    }
    let sortedRankingList = getMetaData(recommendedArray, num);

    let sortedAnimeNames = [];

    for (let i = 0; i < sortedRankingList.length; i++) {
        for (let j = 0; j < animeData.length; j++) {
            if (animeData[j][num] === sortedRankingList[i]) {
                //can add any other meta-data we need to display
                sortedAnimeNames.push(animeData[j][1]);
                recommendationsID.push(animeData[j][0]);
                break;
            }
        }
    }
    return sortedAnimeNames;

}

///////////////////////////////////////////HTML ELEMENTS////////////////////////////////////////////////////////////////

async function fetchAnimeImages(animeIds) {
    const delay = 500; // Delay in milliseconds (2 calls per second) Api only allows 3 per second

    try {
        for (const animeId of animeIds) {
            const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/pictures`);
            const data = await response.json();
            let animeTitle = "";
            let animeSynopsis = "";
            for(let i = 0; i < animeData.length; i++) {
                if (animeData[i][0] === animeId) {
                    animeTitle = animeData[i][1];
                    animeSynopsis = animeData[i][6];
                    break;
                }
            }
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                const item = data.data[0];
                if (item) {
                    const webpUrl = item.webp.image_url;
                    const webpImgElement = document.createElement('img');
                    webpImgElement.src = webpUrl;
                    webpImgElement.alt = "Image"
                    createImageCard(webpImgElement, animeTitle, animeSynopsis);

                } else {
                    createImageCard(null, animeTitle, animeSynopsis);
                }
            } else {
                console.log(`No pictures found for anime ID: ${animeId}`);
                // Handle the case when no pictures are found (e.g., display a placeholder image or skip displaying an image)
                createImageCard(null, animeTitle, animeSynopsis); // Pass null as the image element to indicate no image available
            }

            // Introduce a delay between each API call
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    } catch (error) {
        console.log('An error occurred:', error);
    }
}

function createImageCard(image, title, synopsis) {

    // Create image card elements
    var imageCard = document.createElement("div");
    imageCard.className = "image-card";

    if (image !== null) {
        imageCard.appendChild(image);
    }

    var titleElement = document.createElement("h3");
    titleElement.className = "title";
    titleElement.textContent = title;
    imageCard.appendChild(titleElement);

    // Attach click event to open the modal with card details
    imageCard.addEventListener("click", function() {
        openModal(image, title, synopsis);
    });

    // Insert the image card into the container
    var imageContainer = document.getElementById("imageContainer");
    imageContainer.appendChild(imageCard);
}



