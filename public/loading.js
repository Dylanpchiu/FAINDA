document.addEventListener("DOMContentLoaded", function() {
    var loadingMessage = document.getElementById("loading-message");

    // Show loading message
    loadingMessage.style.display = "block";

    // Simulate file loading (replace this with your actual file loading logic)
    setTimeout(function() {
        // Hide loading message when file is loaded
        loadingMessage.style.display = "none";
    }, 3000); // Adjust the time delay (in milliseconds) to simulate your file loading time
});



function openModal(image, title, description) {
    var modal = document.getElementById("myModal");
    var modalTitle = document.getElementById("modalTitle");
    var modalDescription = document.getElementById("modalDescription");
    var modalImage = document.getElementById("modalImage");

    if(image !== null) {
        modalImage.src = image.src;

    }
    modalTitle.textContent = title;
    modalDescription.textContent = description;

    modal.style.display = "flex"; // Show the modal


}


function closeModal() {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
}