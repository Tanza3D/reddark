// by https://github.com/Krafalski

const searchBar = document.querySelector("input[type='search'");

// Show/hide subreddits that match search inputs
searchBar.addEventListener("input", (e) => {
  // Always compare lowercase letters
  // No matter what the user inputs
  const input = e.target.value.toLowerCase();

  // Select the divs with the subreddit names
  const subredditDivs = document.querySelectorAll(".subreddit");
  // Select the subreddit size headers
  const h1s = document.querySelectorAll("#list h1");

  // Reset all display settings before applying new ones

  // If input field is blank, also reset display settings
  if (!input) {
    // Reset styles of subreddit divs
    for (let div of subredditDivs) {
      div.classList.remove("filtered");
      div.style.display = "";
    }
    // Reset styles of h1s
    for (let h1 of h1s) {
      h1.style.display = "block";
    }
  } else {
    // Check sub names against user input, add a class of filtered if the name does not match
    // The filterd class will set a display of none
    for (let div of subredditDivs) {
      const subName = div.querySelector("a").textContent.toLowerCase();
      if (!subName.includes(input)) {
        div.classList.add("filtered");
        // Deal with competing clasess added to the div
        // Subreddit-private and filtered have opposing displays (hidden vs inherit)
        if (div.classList.contains("subreddit-private")) {
          // Override subreddit-private display
          div.style.display = "none";
        }
      } else {
        div.classList.remove("filtered");
        // Clear display inline style in case it was set
        // When class subreddit-private was also present
        div.style.display = "";
      }
    }

    // Set display to none on the h1 headers that have empty sections
    for (let h1 of h1s) {
      const sectionGrid = h1.nextElementSibling;

      const sectionGridSubDivs = sectionGrid.querySelectorAll("div");
      let allFiltered = true;
      // Edge case, Additional h1s with data for overall numbers
      // Also have a section grid following (but empty)
      // Use the emptiness to prevent hiding h1s that don't need to be hidden

      if (sectionGrid.children.length === 0) {
        allFitered = false;
      }
      // If any of the divs don't have a class of filtered, don't hide the h1
      for (let div of sectionGridSubDivs) {
        if (!div.classList.contains("filtered")) {
          allFiltered = false;
          break;
        }
      }
      // If all the subreddits in the section are hidden
      // hide the h1s for better UI
      if (allFiltered) {
        // The additional information uses the same elements, classes and pattern
        // as the initial subreddit elements
        // Don't set display of none those h1s that provide
        // metadata instead of subreddit size
        // Since all the metadata uses a # as the first character
        // use that to differenicate the two
        if (h1.innerText[0] !== "#") {
          h1.style.display = "none";
        }
      }
    }
  }
});
