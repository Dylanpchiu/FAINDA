function openModal(image, title, description) {
  const modal = document.getElementById("myModal");
  const modalImage = document.getElementById("modalImage");

  if (image) modalImage.src = image.src;
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalDescription").textContent = description;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("myModal").style.display = "none";
}
