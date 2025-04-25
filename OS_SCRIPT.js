document.addEventListener('DOMContentLoaded', () => {
    const visualizeBtn = document.getElementById('visualize');
    const requestsInput = document.getElementById('requests');
    const initialInput = document.getElementById('initial');
    const algorithmSelect = document.getElementById('algorithm');
    const diskArea = document.getElementById('disk-area');
    const seekSequenceSpan = document.getElementById('seek-sequence');
    const metricsInfo = document.getElementById('metrics-info');
    const diskHead = document.querySelector('.disk-head');
    const requestPoints = document.querySelector('.request-points');
    const currentPosition = document.getElementById('current-position');
    const nextRequest = document.getElementById('next-request');
    const headDirection = document.getElementById('head-direction');

    // Constants
    const DISK_SIZE = 1000; // Maximum cylinder number
    const ANIMATION_DELAY = 1000; // Delay between movements in milliseconds
    const TRACK_WIDTH = document.querySelector('.disk-track').clientWidth;

    // Helper function to convert disk position to pixel position
    function diskPositionToPixels(position) {
        return (position / DISK_SIZE) * TRACK_WIDTH;
    }

    // Create request points on the track
    function createRequestPoints(requests) {
        requestPoints.innerHTML = '';
        requests.forEach((req, index) => {
            const point = document.createElement('div');
            point.className = 'request-point';
            point.style.left = `${(req / DISK_SIZE) * 100}%`;
            point.setAttribute('data-position', req);
            requestPoints.appendChild(point);
        });
    }

    // Animate disk head movement
    function animateDiskHead(fromPosition, toPosition) {
        return new Promise(resolve => {
            const startPixels = diskPositionToPixels(fromPosition);
            const endPixels = diskPositionToPixels(toPosition);
            
            // Update direction indicator with animation
            headDirection.textContent = fromPosition < toPosition ? '→' : '←';
            headDirection.classList.add('changing');
            setTimeout(() => headDirection.classList.remove('changing'), 500);
            
            // Update current position with animation
            currentPosition.classList.add('changing');
            currentPosition.textContent = fromPosition;
            setTimeout(() => currentPosition.classList.remove('changing'), 500);

            // Update next request with animation
            nextRequest.classList.add('changing');
            nextRequest.textContent = toPosition;
            setTimeout(() => nextRequest.classList.remove('changing'), 500);

            // Highlight corresponding track number
            const numbers = document.querySelectorAll('.track-numbers span');
            numbers.forEach(num => {
                if (parseInt(num.textContent) <= toPosition) {
                    num.classList.add('highlight');
                    setTimeout(() => num.classList.remove('highlight'), 1000);
                }
            });

            // Animate the head
            diskHead.style.transition = 'left 0.5s ease-in-out';
            diskHead.style.left = `${(toPosition / DISK_SIZE) * 100}%`;

            // Mark completed request points
            const points = document.querySelectorAll('.request-point');
            points.forEach(point => {
                if (parseInt(point.getAttribute('data-position')) === toPosition) {
                    point.classList.add('active');
                    setTimeout(() => point.classList.add('completed'), 500);
                }
            });

            setTimeout(resolve, 500);
        });
    }

    // Helper function to validate input
    function validateInput(requests, initial) {
        const requestArray = requests.split(',').map(r => parseInt(r.trim()));
        const initialPos = parseInt(initial);

        if (requestArray.some(isNaN) || isNaN(initialPos)) {
            alert('Please enter valid numbers');
            return false;
        }

        if (requestArray.some(r => r < 0 || r >= DISK_SIZE) || initialPos < 0 || initialPos >= DISK_SIZE) {
            alert(`All numbers should be between 0 and ${DISK_SIZE-1}`);
            return false;
        }

        return { requestArray, initialPos };
    }

    // Visualization functions
    async function createVisualization(sequence) {
        diskArea.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.width = diskArea.clientWidth;
        canvas.height = 300;
        diskArea.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        // Scale factors
        const xScale = (canvas.width - 60) / DISK_SIZE;
        const yScale = (canvas.height - 60) / sequence.length;

        // Draw axes
        ctx.beginPath();
        ctx.strokeStyle = '#000';
        ctx.moveTo(30, 30);
        ctx.lineTo(30, canvas.height - 30);
        ctx.lineTo(canvas.width - 30, canvas.height - 30);
        ctx.stroke();

        // Draw points and lines with animation
        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;

        // Initialize disk head position
        diskHead.style.left = `${(sequence[0] / DISK_SIZE) * 100}%`;
        currentPosition.textContent = sequence[0];
        
        for (let i = 0; i < sequence.length - 1; i++) {
            if (i === 0) {
                ctx.moveTo(30 + sequence[i] * xScale, canvas.height - 30);
            }
            
            // Draw line to next point
            ctx.lineTo(30 + sequence[i + 1] * xScale, canvas.height - 30 - (i + 1) * yScale);
            ctx.stroke();

            // Draw point
            ctx.beginPath();
            ctx.fillStyle = '#e74c3c';
            ctx.arc(30 + sequence[i] * xScale, canvas.height - 30 - i * yScale, 4, 0, Math.PI * 2);
            ctx.fill();

            // Animate disk head
            await animateDiskHead(sequence[i], sequence[i + 1]);
        }

        // Draw final point
        ctx.beginPath();
        ctx.fillStyle = '#e74c3c';
        ctx.arc(30 + sequence[sequence.length - 1] * xScale, 
                canvas.height - 30 - (sequence.length - 1) * yScale, 
                4, 0, Math.PI * 2);
        ctx.fill();

        // Clear direction after animation
        headDirection.textContent = '-';
        nextRequest.textContent = '-';
    }

    // Disk Scheduling Algorithms
    function FCFS(requests, initial) {
        return [initial, ...requests];
    }

    function SSTF(requests, initial) {
        let current = initial;
        let remaining = [...requests];
        const sequence = [initial];

        while (remaining.length > 0) {
            let nearestIdx = 0;
            let minDistance = Math.abs(current - remaining[0]);

            for (let i = 1; i < remaining.length; i++) {
                const distance = Math.abs(current - remaining[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIdx = i;
                }
            }

            current = remaining[nearestIdx];
            sequence.push(current);
            remaining.splice(nearestIdx, 1);
        }

        return sequence;
    }

    function SCAN(requests, initial) {
        const sequence = [initial];
        const sorted = [...requests].sort((a, b) => a - b);
        const right = sorted.filter(r => r >= initial);
        const left = sorted.filter(r => r < initial);

        // Add right requests
        sequence.push(...right);     
        
        // Add left requests in reverse order
        sequence.push(...left.reverse());

        return sequence;

    }

    function CSCAN(requests, initial) {
        const sequence = [initial];
        const sorted = [...requests].sort((a, b) => a - b);
        const right = sorted.filter(r => r >= initial);
        const left = sorted.filter(r => r < initial);

        sequence.push(...right);
        sequence.push(DISK_SIZE - 1);
        sequence.push(0);
        sequence.push(...left);

        return sequence;
    }

    function LOOK(requests, initial) {
        const sequence = [initial];
        const sorted = [...requests].sort((a, b) => a - b);
        const right = sorted.filter(r => r >= initial);
        const left = sorted.filter(r => r < initial);

        sequence.push(...right);
        sequence.push(...left.reverse());

        return sequence;
    }

    function CLOOK(requests, initial) {
        const sequence = [initial];
        const sorted = [...requests].sort((a, b) => a - b);
        const right = sorted.filter(r => r >= initial);
        const left = sorted.filter(r => r < initial);

        sequence.push(...right);
        sequence.push(...left);

        return sequence;
    }

    // Calculate total head movement
    function calculateHeadMovement(sequence) {
        let total = 0;
        for (let i = 1; i < sequence.length; i++) {
            total += Math.abs(sequence[i] - sequence[i-1]);
        }
        return total;
    }

    // Add track number highlighting
    function highlightTrackNumbers(position) {
        const numbers = document.querySelectorAll('.track-numbers span');
        numbers.forEach(num => {
            if (parseInt(num.textContent) === Math.round(position / 250) * 250) {
                num.classList.add('highlight');
                setTimeout(() => num.classList.remove('highlight'), 1000);
            }
        });
    }

    // Event listener for the visualize button
    visualizeBtn.addEventListener('click', async () => {
        // Add button press animation
        visualizeBtn.style.transform = 'scale(0.95)';
        setTimeout(() => visualizeBtn.style.transform = '', 200);

        const input = validateInput(requestsInput.value, initialInput.value);
        if (!input) return;

        const { requestArray, initialPos } = input;
        let sequence;

        // Create request points before starting animation
        createRequestPoints(requestArray);

        switch (algorithmSelect.value) {
            case 'FCFS':
                sequence = FCFS(requestArray, initialPos);
                break;
            case 'SSTF':
                sequence = SSTF(requestArray, initialPos);
                break;
            case 'SCAN':
                sequence = SCAN(requestArray, initialPos);
                break;
            case 'CSCAN':
                sequence = CSCAN(requestArray, initialPos);
                break;
            case 'LOOK':
                sequence = LOOK(requestArray, initialPos);
                break;
            case 'CLOOK':
                sequence = CLOOK(requestArray, initialPos);
                break;
        }

        // Update UI
        seekSequenceSpan.textContent = sequence.join(' → ');
        const totalMovement = calculateHeadMovement(sequence);
        metricsInfo.textContent = `Total Head Movement: ${totalMovement} cylinders | Average Head Movement: ${(totalMovement / requestArray.length).toFixed(2)} cylinders`;

        // Create visualization with animation
        await createVisualization(sequence);
    });
});
