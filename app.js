// CONFIGURATION SECTION
const config = {
    // Grid layout
    grid: {
        cols: 5,
        rows: 6,
        gap: "1.5rem"
    },
    
    // Timing controls (seconds)
    timing: {
        coverExpand: 5.7,
        pauseAfterExpand: 5,
        contentFadeIn: 5.7,
        displayDuration: 15,
        cycleDelay: 10
    },
    
    // Display settings
    display: {
        maxBooks: 30,
        randomOrder: true
    }
};

// Global variables
let booksData = [];
let currentBookIndex = -1;

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
    
    const particleCount = Math.floor(window.innerWidth / 20);
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 8 + 2;
        const posX = Math.random() * window.innerWidth;
        const posY = Math.random() * window.innerHeight + window.innerHeight;
        const delay = Math.random() * 5;
        const duration = Math.random() * 15 + 10;
        const alpha = Math.random() * 0.4 + 0.1;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.backgroundColor = `rgba(67, 97, 238, ${alpha})`;
        particle.style.opacity = '0';
        
        particlesContainer.appendChild(particle);
    }
}

// Book data and initialization
async function loadBookData() {
    try {
        const response = await fetch('books.json');
        if (!response.ok) throw new Error('Failed to load');
        booksData = await response.json();
        
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
        img.src = `covers/${book.cover}`;
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
    animatedCover.style.transition = `all ${config.timing.coverExpand}s cubic-bezier(0.22, 1, 0.36, 1)`;
    animatedCover.style.transformOrigin = 'center center';
    animatedCover.style.willChange = 'transform, opacity';
    
    document.body.appendChild(animatedCover);
    
    // Force reflow
    void animatedCover.offsetWidth;
    
    // Enhanced animation with bigger scale
    animatedCover.style.top = '50%';
    animatedCover.style.left = '50%';
    animatedCover.style.transform = 'translate(-50%, -50%) scale(1.5)';
    animatedCover.style.borderRadius = '0';
    animatedCover.style.boxShadow = '0 40px 80px rgba(0, 0, 0, 0.4)';
    
    // After animation completes
    setTimeout(() => {
        animatedCover.style.opacity = '0';
        detailPanel.classList.add('active');
        
        // Animate in content with adjusted timing
        const elements = [
            document.getElementById('detailCover'),
            document.querySelector('.detail-info'),
            document.querySelector('.reviews-section'),
            document.getElementById('closeBtn')
        ];
        
        elements.forEach((el, i) => {
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = `fadeInUp ${config.timing.contentFadeIn}s ease ${i * 0.15 + 0.3}s forwards`;
        });
        
        // Remove cloned cover after transition
        setTimeout(() => {
            animatedCover.remove();
        }, config.timing.coverExpand * 1000);
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
        do {
            nextIndex = Math.floor(Math.random() * booksData.length);
        } while (nextIndex === currentBookIndex && booksData.length > 1);
        
        currentBookIndex = nextIndex;
        
        const initialDelay = isFirstBook ? config.timing.cycleDelay * 1000 : 0;
        isFirstBook = false;
        
        setTimeout(() => {
            showBookDetail(currentBookIndex);
            
            // Set timeout for the next book based on display duration
            setTimeout(() => {
                closeBookDetail();
                
                // Set delay before showing next book
                setTimeout(showNextBook, config.timing.cycleDelay * 1000);
            }, (config.timing.displayDuration + config.timing.contentFadeIn) * 1000);
            
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