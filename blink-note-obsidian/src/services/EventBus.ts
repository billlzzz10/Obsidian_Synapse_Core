// src/services/EventBus.ts

// กำหนด Type สำหรับ Listener function
type Listener<T> = (payload: T) => void;

/**
 * A simple, type-safe event bus for decoupled communication
 * between different parts of the plugin.
 */
export class EventBus {
    // ใช้ Map เพื่อเก็บ listeners โดยมี key เป็นชื่อ event
    private events: Map<string, Listener<any>[]> = new Map();

    /**
     * Subscribes to an event.
     * @param eventName The name of the event to listen for.
     * @param listener The function to call when the event is published.
     * @returns A function to unsubscribe the listener.
     */
    public subscribe<T>(eventName: string, listener: Listener<T>): () => void {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        this.events.get(eventName)!.push(listener);

        // คืนค่าเป็นฟังก์ชันสำหรับ unsubscribe
        return () => {
            const listeners = this.events.get(eventName);
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Publishes an event to all subscribed listeners.
     * @param eventName The name of the event to publish.
     * @param payload The data to pass to the listeners.
     */
    public publish<T>(eventName: string, payload: T): void {
        const listeners = this.events.get(eventName);
        if (listeners) {
            // ใช้ forEach เพื่อส่ง event ให้ทุก listener ที่ลงทะเบียนไว้
            listeners.forEach(listener => {
                try {
                    listener(payload);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                }
            });
        }
    }
}

// สร้าง instance เดียวเพื่อใช้ทั่วทั้งแอปพลิเคชัน (Singleton pattern)
export const eventBus = new EventBus();
