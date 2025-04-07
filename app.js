// ======================
// CONFIGURATION SECTION
// ======================
const config = {
    // Grid layout
    grid: {
        cols: 5,    // Number of columns
        rows: 6,    // Number of rows (will show cols x rows books)
        gap: "1.5rem" // Gap between grid items
    },
    
    // Timing controls (all values in seconds)
    timing: {
        coverExpand: 0.5,    // Cover expansion animation duration
        pauseAfterExpand: 2, // Pause after expansion before showing details
        contentFadeIn: 0.7,  // Time for content to fade in
        displayDuration: 10, // How long to show each book in auto mode
        cycleDelay: 3        // Delay between book cycles in auto mode
    },
    
    // Display settings
    display: {
        maxBooks: 30,       // Maximum number of books to show (0 for all)
        randomOrder: true   // Whether to display books in random order
    }
};

// Calculate derived timing values
const totalAnimationTime = 
    config.timing.coverExpand + 
    config.timing.pauseAfterExpand + 
    config.timing.contentFadeIn;

const totalCycleTime = totalAnimationTime + config.timing.displayDuration;

// Global variables
let booksData = [];
let currentBookIndex = -1;

// Helper function to shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Load book data from JSON file
async function loadBookData() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error('Failed to load book data');
        }
        booksData = await response.json();
        
        // Apply max books limit if configured
        if (config.display.maxBooks > 0 && booksData.length > config.display.maxBooks) {
            booksData = booksData.slice(0, config.display.maxBooks);
        }
        
        // Randomize order if configured
        if (config.display.randomOrder) {
            booksData = shuffleArray(booksData);
        }
        
        initBookGrid();
        autoShowBooks();
    } catch (error) {
        console.error('Error loading book data:', error);
        // You could add a fallback here or show an error message to the user
        document.getElementById('booksGrid').innerHTML = 
            '<p class="error">Failed to load books. Please try again later.</p>';
    }
}

// Initialize the book grid based on config
function initBookGrid() {
    const grid = document.getElementById('booksGrid');
    grid.innerHTML = '';
    
    // Set grid layout from config
    grid.style.gridTemplateColumns = `repeat(${config.grid.cols}, 1fr)`;
    grid.style.gap = config.grid.gap;
    
    // Calculate how many books to show (cols x rows)
    const booksToShow = Math.min(
        config.grid.cols * config.grid.rows,
        booksData.length
    );
    
    // Create grid items
    for (let i = 0; i < booksToShow; i++) {
        const book = booksData[i];
        const bookElement = document.createElement('div');
        bookElement.className = 'book';
        
        const img = document.createElement('img');
        img.className = 'book-cover';
        img.src = `covers/${book.cover}`;
        img.alt = book.title;
        img.dataset.index = i;
        
        img.addEventListener('click', () => showBookDetail(i));
        
        bookElement.appendChild(img);
        grid.appendChild(bookElement);
    }
}

// Show book details with configured timing
function showBookDetail(index) {
    const book = booksData[index];
    const overlay = document.getElementById('overlay');
    const detailPanel = document.getElementById('bookDetail');
    
    // Set the detail content
    document.getElementById('detailCover').src = `covers/${book.cover}`;
    document.getElementById('detailTitle').textContent = book.title;
    document.getElementById('detailAuthor').textContent = `by ${book.author}`;
    document.getElementById('detailDescription').textContent = book.description;
    
    // Set reviews
    const review1Element = document.getElementById('review1');
    review1Element.querySelector('.review-text').textContent = book.reviews[0].text;
    review1Element.querySelector('.review-author').textContent = book.reviews[0].author;
    
    const review2Element = document.getElementById('review2');
    if (book.reviews.length > 1) {
        review2Element.querySelector('.review-text').textContent = book.reviews[1].text;
        review2Element.querySelector('.review-author').textContent = book.reviews[1].author;
        review2Element.style.display = 'block';
    } else {
        review2Element.style.display = 'none';
    }
    
    // Show overlay
    overlay.classList.add('active');
    
    // Find the clicked cover element
    const covers = document.querySelectorAll('.book-cover');
    const clickedCover = covers[index];
    
    // Clone the clicked cover for animation
    const animatedCover = clickedCover.cloneNode();
    animatedCover.classList.add('active');
    document.body.appendChild(animatedCover);
    
    // After cover expansion completes, wait configured pause, then show details
    setTimeout(() => {
        animatedCover.remove();
        detailPanel.classList.add('active');
        
        // Animate in content with configured timing
        const elements = [
            document.getElementById('detailCover'),
            document.querySelector('.detail-info'),
            document.querySelector('.reviews-section'),
            document.getElementById('closeBtn')
        ];
        
        elements.forEach((el, i) => {
            el.style.animation = 'none';
            void el.offsetWidth; // Trigger reflow
            el.style.animation = `fadeInContent 0.5s ease ${0.1 * i}s forwards`;
        });
    }, config.timing.coverExpand * 1000 + config.timing.pauseAfterExpand * 1000);
}

// Close book detail
function closeBookDetail() {
    const overlay = document.getElementById('overlay');
    const detailPanel = document.getElementById('bookDetail');
    
    detailPanel.classList.remove('active');
    overlay.classList.remove('active');
    
    // Reset animations for next time
    const elements = [
        document.getElementById('detailCover'),
        document.querySelector('.detail-info'),
        document.querySelector('.reviews-section'),
        document.getElementById('closeBtn')
    ];
    
    elements.forEach(el => {
        el.style.animation = 'none';
    });
}

// Auto-show random books with configured timing
function autoShowBooks() {
    if (booksData.length === 0) return;
    
    let isFirstBook = true;
    
    function showNextBook() {
        closeBookDetail();
        
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * booksData.length);
        } while (nextIndex === currentBookIndex && booksData.length > 1);
        
        currentBookIndex = nextIndex;
        
        const initialDelay = isFirstBook ? config.timing.cycleDelay * 1000 : 300;
        isFirstBook = false;
        
        setTimeout(() => {
            showBookDetail(currentBookIndex);
            setTimeout(showNextBook, totalCycleTime * 1000);
        }, initialDelay);
    }
    
    showNextBook();
}

// Initialize
document.getElementById('closeBtn').addEventListener('click', closeBookDetail);
document.getElementById('overlay').addEventListener('click', closeBookDetail);
window.addEventListener('DOMContentLoaded', loadBookData);