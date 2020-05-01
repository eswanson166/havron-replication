
## MTurk Experiment Template
*The original version of this readme file was written by Ciyang Qing.*

Here we are using a template for web-based experiments developed and used in Noah Goodman's CoCoLab.

Inside your `experiment` folder you should see (using `ls` or the GUI file finder in your OS) an `index.html` file and 3 folders: `css`, `js`, and `shared`. These folders contain all the relevant files that power the template experiment.
We will go through them shortly and explain what they do. You are encouraged to make changes!!

The `shared` folder contains common files needed for the template and you generally do not need to change or worry about them (but you are encouraged to take a look at some point just to get a sense of what is in there). Everything else specific to the particular experiment is stored in the other two folders and the `index.html` file.

### HTML

1. The first part of the html file is between the head tags `<head> </head>`. Generally, you only need to make a few changes to reflect things specific to the current experiment (the part is close to the closing tag `</head>`).  

2. In between the body tags `<body> </body>` are (mostly) the slides used in the whole experiment. Each slide is specified within the div tags as follows `<div class="slide" id="[slideID]"></div>`. You can see that there are currently slides, whose ids are `i0`, `instructions`, `single_trial`, `one_slider`, `multi_slider`, `vertical_sliders`, `subj_info`, `thanks`.
In general, you do not need to edit the `subj_info`and
`thanks` slides, and depending on the particular experiment design, you may have various number of slides between `instructions` and `subj_info` corresponding to different blocks in your experiment.

The HTML file only specifies the skeleton of your experiment, the rest of the work is done using JavaScript.

### JavaScript

The JavaScript file `index.js` in the  `js` folder specifies the flow of the experiment.

First, scroll towards the end and you will see a function called `init`.
This specifies the initialization process when the entire experiment is loaded. Generally you only need to do two things here: (i) randomly assign between-subject conditions to `exp.condition` and (ii) specify the array of blocks in `exp.structure`.

Next, scroll back to the beginning to the `make_slides` function.
This is where you specify the control flow for
 each slide, using the format
 ```
 slides.[slideName] = slide({...slide specification...});
 ```
 
Technically, the slide specification (including the curly brackets) is an object that is passed
 as argument to the `slide` function,
but the details do not matter too much for now.
Generally we just need to add a bunch of  `key: value` specifications, separated by commas.
Below are some common ones:

1. `name: "[name of the slide]"`

2. `start: function(){...stuff that happens at the beginning of the block...}` For instance, at
 the beginning of the example slide,
 the error message is hidden: `$(".err").hide();`

3. `present: [an array of objects]` If a block contains multiple trials, then the trials will
 be run making use of the first element in the array to the last. See `present_handle` below.

4. `present_handle: function(stim){...render the exact content to be presented in the slide for the current trial...}` Here `stim` is an element in the array specified in `present` above.

5.  `button: function(){...stuff that happens when the button is clicked on...}` This is the place to verify responses, log data and go to the next step of the experiment.  
For instance, look at how this is defined
 in the critical slide (`slides.critical`).
The first line retrieves the checked radio button. If in fact no button is checked, then
 the error message is shown. Otherwise the response is logged (see `log_responses` below) and the next trial/block starts.  


6. `log_responses: function(){...logging responses...}` This is usually done by calling the push function of an array.
To find out which array is relevant, take a look at `slides.thanks`.  
**Very important: absolutely make sure that you have logged all the relevant information by checking the output at the end of the experiment in the debug mode AND go through the process in the Sandbox.**

Now you should have a sense of the basic flow of the experiment, but it probably will take a lot of trials and errors for you to get familiar with it.
  
### Next: 
Take a look at `slides.single_trial`, `slides.multi_slider`, `slides.vertical_sliders`, `slides.subj_info` to see how various response types are logged. 

Try to modify the critical slide in various ways so that the responses are in the form of (i) a slider, (ii) a drop-down panel, (iii) a textbox. Pay attention to what kind of verification and error messages are suitable in each cases.
