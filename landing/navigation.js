const button = document.querySelector(".menu-button");
const navigation = document.querySelector("#main-nav");
if (button && navigation) {
  document.body.classList.add("has-menu-js");
  function closeMenu() {
    button.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  }
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("is-open", open);
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      closeMenu();
      button.focus();
    }
  });
}
