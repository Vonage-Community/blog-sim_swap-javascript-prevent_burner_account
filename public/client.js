document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
          alert(data.message);
          window.location.href = "/main";
        } else {
          if (data.simSwapped) {
            alert(
              "Access denied: A recent SIM swap was detected. Please contact support."
            );
          } else if (response.status === 401 || response.status === 404) {
            alert(`Unable to login: ${data.message}`);
          } else {
            alert("Unexpected error occurred. Please try again.");
          }
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("There was a login error.");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const username = document.getElementById("regUsername").value;
      const password = document.getElementById("regPassword").value;
      const phoneNumber = document.getElementById("phoneNumber").value;

      try {
        const response = await fetch("/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password, phoneNumber }),
        });

        const data = await response.json();

        if (response.ok) {
          alert(data.message);
          window.location.href = "/";
        } else {
          alert(`Error during sign up: ${data.message}`);
        }
      } catch (error) {
        alert("Sorry, an error occurred during the registration process.");
      }
    });
  }
});
