import { CSPARQLWindow } from "../operators/s2r";

export class IntervalManager {

    public window_instance: CSPARQLWindow;

    constructor(window_instance: CSPARQLWindow) {
        this.window_instance = window_instance;
    }

    clear_interval() {
        if (this.window_instance.interval_id) {
            clearInterval(this.window_instance.interval_id);
            console.log(`Interval cleared for window ${this.window_instance.name} with id ${this.window_instance.interval_id}`);
        }
        else {
            console.log(`No interval to clear for window ${this.window_instance.name}`);
        }
    }
}