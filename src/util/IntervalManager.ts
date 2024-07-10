import { CSPARQLWindow } from "../operators/s2r";

/**
 * Class to manage the intervals for the CSPARQL Window.
 */
export class IntervalManager {

    public window_instance: CSPARQLWindow;

    /**
     * Constructor for the IntervalManager class.
     * @param {CSPARQLWindow} window_instance - The CSPARQL Window instance for which the interval is to be managed. 
     */
    constructor(window_instance: CSPARQLWindow) {
        this.window_instance = window_instance;
    }

    /**
     * Set the interval for the CSPARQL Window.
     */
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