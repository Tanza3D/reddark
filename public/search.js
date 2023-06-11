// by https://github.com/Krafalski

const searchBar = document.querySelector("input[type='search'");
const form = document.querySelector(".amount form");

// Show/hide subreddits that match search inputs
searchBar.addEventListener("input", (e) => {
    const input = e.target.value;

    // Select the divs with the subreddit names
    const subredditDivs = document.querySelectorAll(".subreddit");
    // Select the subreddit size headers
    const h1s = document.querySelectorAll("#list h1");

    // Reset all display settings before applying new ones
    for (let h1 of h1s) {
        h1.style.display = "block";
    }

    // If input field is blank, reset display settings
    if (!input) {
        for (let div of subredditDivs) {
            div.classList.remove("filtered");
        }
    } else {
        // Check sub names against user input, add a class of filtered if the name does not match
        // The filterd class will set a display of none
        for (let div of subredditDivs) {
            const subName = div.querySelector("a").textContent.toLowerCase();
            if (!subName.includes(input)) {
                div.classList.add("filtered");
            } else {
                div.classList.remove("filtered");
            }
        }

        // Set display to none on the h1 headers that have empty sections
        for (let h1 of h1s) {
            const sectionGrid = h1.nextElementSibling;
            const sectionGridSubDivs = sectionGrid.querySelectorAll("div");
            let allFiltered = true;
            // if any of the divs don't have a class of filtered, don't hide the h1
            for (let div of sectionGridSubDivs) {
                if (!div.classList.contains("filtered")) {
                    allFiltered = false;
                    break;
                }
            }
            if (allFiltered) {
                h1.style.display = "none";
            }
        }
    }
});