// Task queue management
class QueueManager {
    constructor() {
        this.queues = new Map();
        this.workers = new Map();
        this.maxConcurrent = 3;
        this.retryLimit = 3;
        this.retryDelay = 1000;
    }

    createQueue(name, options = {}) {
        if (this.queues.has(name)) {
            throw new Error(`Queue ${name} already exists`);
        }

        const queue = {
            name,
            tasks: [],
            running: false,
            concurrent: options.concurrent || this.maxConcurrent,
            retryLimit: options.retryLimit || this.retryLimit,
            retryDelay: options.retryDelay || this.retryDelay,
            paused: false
        };

        this.queues.set(name, queue);
        return queue;
    }

    async addTask(queueName, task) {
        const queue = this.getQueue(queueName);
        const taskWrapper = {
            id: crypto.randomUUID(),
            task,
            attempts: 0,
            status: 'pending',
            added: Date.now()
        };

        queue.tasks.push(taskWrapper);
        this.processQueue(queueName);
        
        return taskWrapper.id;
    }

    async processQueue(queueName) {
        const queue = this.getQueue(queueName);
        
        if (queue.paused || queue.running) {
            return;
        }

        queue.running = true;

        while (queue.tasks.length > 0) {
            const running = queue.tasks.filter(t => t.status === 'running');
            if (running.length >= queue.concurrent) {
                break;
            }

            const task = queue.tasks.find(t => t.status === 'pending');
            if (!task) {
                break;
            }

            this.processTask(queueName, task);
        }

        queue.running = queue.tasks.some(t => t.status === 'running');
    }

    async processTask(queueName, task) {
        const queue = this.getQueue(queueName);
        task.status = 'running';
        task.attempts++;
        task.started = Date.now();

        try {
            const result = await task.task();
            task.status = 'completed';
            task.completed = Date.now();
            task.result = result;

            this.cleanupTask(queueName, task);
        } catch (error) {
            console.error(`Task error in queue ${queueName}:`, error);
            
            if (task.attempts < queue.retryLimit) {
                task.status = 'pending';
                task.error = error;
                await new Promise(resolve => 
                    setTimeout(resolve, queue.retryDelay * task.attempts)
                );
            } else {
                task.status = 'failed';
                task.error = error;
                this.cleanupTask(queueName, task);
            }
        }

        this.processQueue(queueName);
    }

    cleanupTask(queueName, task) {
        const queue = this.getQueue(queueName);
        const index = queue.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            queue.tasks.splice(index, 1);
        }
    }

    pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        queue.paused = true;
    }

    resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        queue.paused = false;
        this.processQueue(queueName);
    }

    clearQueue(queueName) {
        const queue = this.getQueue(queueName);
        queue.tasks = queue.tasks.filter(t => t.status === 'running');
    }

    getQueue(name) {
        const queue = this.queues.get(name);
        if (!queue) {
            throw new Error(`Queue ${name} does not exist`);
        }
        return queue;
    }

    getTaskStatus(queueName, taskId) {
        const queue = this.getQueue(queueName);
        const task = queue.tasks.find(t => t.id === taskId);
        return task || null;
    }

    getQueueStats(queueName) {
        const queue = this.getQueue(queueName);
        return {
            total: queue.tasks.length,
            pending: queue.tasks.filter(t => t.status === 'pending').length,
            running: queue.tasks.filter(t => t.status === 'running').length,
            completed: queue.tasks.filter(t => t.status === 'completed').length,
            failed: queue.tasks.filter(t => t.status === 'failed').length
        };
    }

    removeQueue(name) {
        this.queues.delete(name);
    }
}

// Create global queue instance
export const queue = new QueueManager();