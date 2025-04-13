// CONFIGURATION SECTION
const config = {
    // Grid layout
    grid: {
        cols: 8,
        rows: 5,
        gap: "0.9rem"
    },
    
    // Timing controls (seconds)
    timing: {
        coverExpand: 2.5,
        pauseAfterExpand: 0.5,
        contentFadeIn: 0.7,
        displayDuration: 10,
        cycleDelay: 2
    },
    
    // Display settings
    display: {
        maxBooks: 40,
        randomOrder: false
    }
};

// Global variables
let booksData = [];
let currentBookIndex = -1;
let animationActive = true;
let animationTimeouts = [];

// Helper functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function createParticles() {
    const particlesContainer = document.querySelector('.particles');
    particlesContainer.innerHTML = '';

    const particleCount = Math.floor(window.innerWidth / 10);

    // 🎨 Color scheme based on your theme (warm + soft complementary tones)
    const colors = [
        'rgba(225, 162, 59, ALPHA)',   // ochre gold
        'rgba(244, 210, 140, ALPHA)',  // light gold
        'rgba(199, 141, 58, ALPHA)',   // bronze
        'rgba(255, 204, 153, ALPHA)',  // peach
        'rgba(255, 179, 186, ALPHA)',  // soft rose
        'rgba(189, 224, 216, ALPHA)',  // mint/sage
        'rgba(174, 198, 207, ALPHA)',  // soft blue-grey
        'rgba(210, 180, 222, ALPHA)',  // lavender
        'rgba(255, 239, 197, ALPHA)',  // pale yellow
        'rgba(144, 190, 222, ALPHA)'   // sky blue
    ];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = Math.random() * 50 + 2;
        const posX = Math.random() * window.innerWidth;
        const posY = Math.random() * window.innerHeight + window.innerHeight;
        const delay = Math.random() * 5;
        const duration = Math.random() * 15 + 10;
        const alpha = Math.random() * 0.4 + 0.1;

        // Choose a base color and insert the alpha
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        const colorWithAlpha = baseColor.replace('ALPHA', alpha.toFixed(2));

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.backgroundColor = colorWithAlpha;
        particle.style.opacity = '0';

        particlesContainer.appendChild(particle);
    }
}


// Book data and initialization
async function loadBookData() {
    try {
        const response = await fetch('books_data_with_reviews.json');
        if (!response.ok) throw new Error('Failed to load');
        booksData = await response.json();
        booksData = booksData.books;
        if (config.display.maxBooks > 0 && booksData.length > config.display.maxBooks) {
            booksData = booksData.slice(0, config.display.maxBooks);
        }
        
        if (config.display.randomOrder) {
            booksData = shuffleArray(booksData);
        }
        
        initBookGrid();
        autoShowBooks();
    } catch (error) {
        console.error('Error loading book data:', error);
        document.getElementById('booksGrid').innerHTML = 
            '<p class="error">Failed to load books. Please try again later.</p>';
    }
}

function initBookGrid() {
    const grid = document.getElementById('booksGrid');
    grid.innerHTML = '';
    
    grid.style.gridTemplateColumns = `repeat(${config.grid.cols}, 1fr)`;
    grid.style.gap = config.grid.gap;
    
    const booksToShow = Math.min(
        config.grid.cols * config.grid.rows,
        booksData.length
    );
    
    for (let i = 0; i < booksToShow; i++) {
        const book = booksData[i];
        const bookElement = document.createElement('div');
        bookElement.className = 'book';
        
        const img = document.createElement('img');
        img.className = 'book-cover';
        img.src = `covers/${book.image_file}`;
        img.alt = book.title;
        img.dataset.index = i;
        
        const titleOverlay = document.createElement('div');
        titleOverlay.className = 'book-title';
        titleOverlay.textContent = book.title;
        
        img.addEventListener('click', () => showBookDetail(i));
        
        bookElement.appendChild(img);
        bookElement.appendChild(titleOverlay);
        grid.appendChild(bookElement);
    }
}

// Book display functions
function showBookDetail(index) {
    const book = booksData[index];
    const overlay = document.getElementById('overlay');
    const detailPanel = document.getElementById('bookDetail');
    
    // Set content
    document.getElementById('detailCover').src = `covers/${book.image_file}`;
    document.getElementById('detailTitle').textContent = book.title;
    document.getElementById('detailAuthor').textContent = `by ${book.author}`;
    document.getElementById('detailDescription').textContent = book.description;
    
    // Set up to 4 reviews
    const reviewsSection = document.querySelector('.reviews-section');
    const reviewElements = [
        document.getElementById('review1'),
        document.getElementById('review2'),
        document.getElementById('review3'),
        document.getElementById('review4')
    ];

    if (Array.isArray(book.reviews) && book.reviews.length > 0) {
        document.getElementById('noReviewMessage').style.display = 'none';
        reviewElements.forEach((el, i) => {
            if (book.reviews[i]) {
                el.querySelector('.review-text').textContent = book.reviews[i].text;
                el.querySelector('.review-author').textContent = book.reviews[i].author;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    } else {
        reviewElements.forEach(el => {
            el.style.display = 'none';
        });
        document.getElementById('noReviewMessage').style.display = 'block';
    }
 
    
    // Show overlay
    overlay.classList.add('active');
    
    // Create animated cover
    const covers = document.querySelectorAll('.book-cover');
    const clickedCover = covers[index];
    const animatedCover = clickedCover.cloneNode(true);
    
    const rect = clickedCover.getBoundingClientRect();
    animatedCover.style.position = 'fixed';
    animatedCover.style.top = `${rect.top}px`;
    animatedCover.style.left = `${rect.left}px`;
    animatedCover.style.width = `${rect.width}px`;
    animatedCover.style.height = `${rect.height}px`;
    animatedCover.style.margin = '0';
    animatedCover.style.zIndex = '1000';
    animatedCover.style.transition = `all ${config.timing.coverExpand}s cubic-bezier(0.22, 1, 0.06, 1)`;
    animatedCover.style.transformOrigin = 'center center';
    animatedCover.style.willChange = 'transform, opacity';
    
    document.body.appendChild(animatedCover);
    
    // Force reflow
    void animatedCover.offsetWidth;
    
    // Enhanced animation with bigger scale
    animatedCover.style.top = '50%';
    animatedCover.style.left = '50%';
    animatedCover.style.transform = 'translate(-50%, -50%) scale(3)';
    animatedCover.style.borderRadius = '0';
    animatedCover.style.boxShadow = '0 40px 80px rgba(0, 0, 0, 0.4)';
    
    // After cover expand animation completes
    setTimeout(() => {
        // Pause after expand
        setTimeout(() => {
            animatedCover.style.opacity = '0';
            detailPanel.classList.add('active');
            
            // Animate in content
            const elements = [
                document.getElementById('detailCover'),
                document.querySelector('.detail-info'),
                document.querySelector('.reviews-section'),
                document.getElementById('closeBtn')
            ];
            
            elements.forEach((el, i) => {
                el.style.animation = 'none';
                void el.offsetWidth;
                el.style.animation = `fadeInUp ${config.timing.contentFadeIn}s ease ${i * 0.15}s forwards`;
            });
            
            // Remove cloned cover after transition
            setTimeout(() => {
                animatedCover.remove();
            }, config.timing.contentFadeIn * 1000);
            
        }, config.timing.pauseAfterExpand * 1000);
        
    }, config.timing.coverExpand * 1000);
}

function closeBookDetail() {
    const overlay = document.getElementById('overlay');
    const detailPanel = document.getElementById('bookDetail');
    
    // Reset animations
    const elements = [
        document.getElementById('detailCover'),
        document.querySelector('.detail-info'),
        document.querySelector('.reviews-section'),
        document.getElementById('closeBtn')
    ];
    
    elements.forEach(el => {
        el.style.animation = 'none';
    });
    
    overlay.classList.remove('active');
    detailPanel.classList.remove('active');
}

// Auto-show books
function autoShowBooks() {
    if (booksData.length === 0) return;
    
    let isFirstBook = true;
    
    function showNextBook() {
        closeBookDetail();
        
        let nextIndex;
        // do {
        //     nextIndex = Math.floor(Math.random() * booksData.length);
        // } while (nextIndex === currentBookIndex && booksData.length > 1);
        
        // currentBookIndex = nextIndex;
        currentBookIndex++;
        if(currentBookIndex >= booksData.length) {
            currentBookIndex = 0;
            isFirstBook = true;
        }
        const initialDelay = isFirstBook ? config.timing.cycleDelay * 1000 : 0;
        isFirstBook = false;
        
        setTimeout(() => {
            showBookDetail(currentBookIndex);
            
            // Calculate total display time including all phases
            const totalDisplayTime = (
                config.timing.coverExpand + 
                config.timing.pauseAfterExpand + 
                config.timing.contentFadeIn + 
                config.timing.displayDuration
            ) * 1000;
            
            // Set timeout for the next book
            setTimeout(() => {
                closeBookDetail();
                setTimeout(showNextBook, config.timing.cycleDelay * 1000);
            }, totalDisplayTime);
            
        }, initialDelay);
    }
    
    showNextBook();
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    createParticles();
    loadBookData();
    
    window.addEventListener('resize', () => {
        createParticles();
    });
    
    document.getElementById('closeBtn').addEventListener('click', closeBookDetail);
    document.getElementById('overlay').addEventListener('click', closeBookDetail);
});
