"""
This code processes .txt files containing raw eye-tracking data.
"""

import ast
import csv
import os


def main():
    # set the directory to wherever you have the raw data files stored
    directory = r'/Users/elizabethswanson/Desktop/raw_data_processing/txt_files'
    for entry in os.scandir(directory):
        filename = os.path.basename(entry)
        print(filename)
        participant_id = filename.strip(".txt")
        processed_data = process_subject_data(entry)
        data_no_id = remove_subj_id(processed_data, participant_id)
        final_data = make_dataframe(data_no_id)
        write_dataframe(final_data, participant_id)


def process_subject_data(filename):
    """
    Processes the data for one file.
    """
    file = open(filename, errors='ignore')
    data = []
    for line in file:
        data.append(line)
    data = data[1:4]
    new_data = {}
    for i in range(len(data)):
        if i == 0:
            key = "trials"
        elif i == 1:
            key = "system"
        else:
            key = "subject_information"
        line = data[i]
        line = line.strip().strip(",")
        if key != "trials":
            for j in range(len(line)):
                if line[j] == "{":
                    start_bracket = j
                elif line[j] == "}":
                    end_bracket = j + 1
            new_line = line[start_bracket:end_bracket]
            new_line = ast.literal_eval(new_line)
            new_data[key] = new_line
        else:
            new_lines = []
            for j in range(len(line)):
                if line[j] == "{":
                    start_bracket = j
                elif line[j] == "}":
                    end_bracket = j + 1
                    new_line = line[start_bracket:end_bracket]
                    new_line = ast.literal_eval(new_line)
                    new_lines.append(new_line)
            new_data[key] = new_lines
    return new_data


def remove_subj_id(dataframe, participant_id):
    """
    Removes the subject ID (for example, the Prolific or Mechanical Turk
    ID) so the participant data is anonymized.
    """
    if "subject_information" in dataframe:
        subj_info = dataframe["subject_information"]
        if "prolific_id" in subj_info:
            del subj_info["prolific_id"]
        subj_info["participant_id"] = participant_id
    return dataframe


def make_header(dataframe):
    """
    Makes the header for the .csv file that we will output.
    """
    header = []
    trials = {}
    trials_header = {}
    if "trials" in dataframe:
        trials = dataframe["trials"]
        trials_header = trials[0].keys()
    for label in trials_header:
        header.append(label)
    system = {}
    if "system" in dataframe:
        system = dataframe["system"]
    system_header = system.keys()
    for label in system_header:
        header.append(label)
    subj_info = {}
    if "subject_information" in dataframe:
        subj_info = dataframe["subject_information"]
    subj_header = subj_info.keys()
    for label in subj_header:
        header.append(label)
    return header


def make_dataframe(dataframe):
    """
    Makes the dataframe that we will output.
    """
    trials = {}
    system = {}
    subj_info = {}
    if "trials" in dataframe:
        trials = dataframe["trials"]
    if "system" in dataframe:
        system = dataframe["system"].values()
    if "subject_information" in dataframe:
        subj_info = dataframe["subject_information"].values()
    trial_data_final = []
    header = make_header(dataframe)
    trial_data_final.append(header)
    for trial in trials:
        trial_info = []
        trial_data = trial.values()
        for data_point in trial_data:
            if not isinstance(data_point, list):
                trial_info.append(data_point)
        for i in range(len(trial["time"])):
            single_look = trial_info.copy()
            single_look.append(trial["time"][i])
            single_look.append(trial["x"][i])
            single_look.append(trial["y"][i])
            single_look += system
            single_look += subj_info
            trial_data_final.append(single_look)
    return trial_data_final


def write_dataframe(dataframe, filename):
    """
    Writes the dataframe for a single participant to a .csv file.
    """
    with open('csv_files/' + filename + '.csv', 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(dataframe)


if __name__ == "__main__":
    main()