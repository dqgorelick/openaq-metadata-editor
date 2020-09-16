import React from 'react';
import { connect } from 'react-redux';


import measurementSchema from './measurement-schema.json';

import validator from 'jsonschema';
import fileReaderStream from 'filereader-stream';
import csv from 'csv-stream';

import Header from '../components/header';

class Home extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      status: 'initial',
      formFile: 'Choose File to Upload',
      metadata: {},
      errors: [],
      fileWarning: false
    };
    this.csvFile = undefined
  }

  setErrorState (failures, metadata) {
    if (failures.length) {
      this.setState({
        status: 'verifyErr',
        metadata: metadata,
        errors: failures});
    } else {
      this.setState({
        status: 'verifySucc',
        metadata: metadata,
        errors: failures});
    }
    return;
  }

  // move to another file 

  checkHeader (header) {
    const required = [
      'parameter', 'unit', 'value', 'sourceName', 'sourceType',
      'date', 'mobile', 'location', 'city', 'country'
    ];
    let failures = [];
    required.forEach((prop) => {
      if (!(prop in header)) failures.push(`Dataset is missing "${prop}" column.`);
    });
    return failures;
  }

  parseCsv () {
    if (this.csvFile) {
      const csvStream = csv.createStream({delimiter: ',', endLine: '\n'});
      const email = this.state.email;
      let records = [];
      let metadata = {};
      let failures = [];
      let line = 0;
      fileReaderStream(this.csvFile).pipe(csvStream)
        .on('error', (failure) => {
          failures.push(failure);
        })
        .on('data', (data) => {
          // Check for data;
          if (!data || data === {}) {
            failures = ['No data provided'];
            this.setErrorState(failures);
          }
          if (line === 0 && !failures.length) {
            // Check header on first line
            failures = failures.concat(this.checkHeader(data));
            if (failures.length) this.setErrorState(failures);
          }
          // Parse CSV
          if (!failures.length) {
            let record = {};
            Object.keys(data).forEach((key) => {
              let value = data[key];
              // Numeric strings should be converted to numbers
              if (!isNaN(value)) value = Number(value);
              // Sub-keys will be indicated by a slash
              const splitKey = key.split('/');
              // Treat values attached to primary keys differently than those with subkeys
              if (splitKey.length === 1) {
                // The "mobile" attribute should be converted to boolean
                if (key === 'mobile' && isNaN(value)) {
                  if (value.toLowerCase() === 'true') {
                    value = true;
                  } else if (value.toLowerCase() === 'false') {
                    value = false;
                  }
                }
                // Save value to record
                record[key] = value;
              // Treat values attached to subkeys differently than those attached to primary keys
              } else {
                const [key, subkey] = splitKey;
                // Treat attribution differently, as it is an array of name/url pairs
                if (key === 'attribution') {
                  if (subkey === 'name' && isNaN(value)) {
                    // Attribution arrays will be separated by a space-padded pipe character (|) in the csv.
                    // URL order and number must match name order and number (if a URL isn't paired
                    // with a name, the user will still need to provide a separator to skip it).
                    // This is hard to represent in csv; we may be able to find a better way.
                    const urls = data['attribution/url'].split('|');
                    value = value.split('|').map((name, i) => {
                      const url = urls[i];
                      if (url.length) {
                        return {name: name, url: url};
                      }
                      return {name: name};
                    });
                    record[key] = value;
                  }
                } else {
                  // Add subkeys, if applicable
                  if (key === 'date' && !record['date']) record['date'] = {};
                  if (key === 'averagingPeriod' && !record['averagingPeriod']) record['averagingPeriod'] = {};
                  if (key === 'coordinates' && !record['coordinates']) record['coordinates'] = {};
                  // Dates are not a valid JSON type, so enforcing a particular format would be subjective.
                  // We may change the schema to a regex string validator.
                  if (key === 'date' && subkey === 'utc' && isNaN(value)) {
                    value = new Date(value);
                  }
                  // Save value to record
                  record[key][subkey] = value;
                }
              }
            });
            // Perform validation of the compiled object against the JSON schema file
            let v = validator.validate(record, measurementSchema);
            v.errors.forEach((e) => {
              failures.push(`Record ${line}: ${e.stack}`);
            });
            if (line === 0) {
              // Initialize metadata object on first line
              metadata.location = [];
              metadata.city = [];
              metadata.country = [];
              metadata.dates = {};
              metadata.values = {};
            }
            // Add array information to metadata
            metadata.location.push(record.location);
            metadata.city.push(record.city);
            metadata.country.push(record.country);
            metadata.dates[record.date.local] = true;
            metadata.values[record.parameter] = true;

            // Add email to record
            data['email'] = email;
            // Add record to array
            records.push(data);
            line++;
          }
        })
        .on('end', () => {
          metadata.measurements = line;
          this.setErrorState(failures, metadata);
          if (!failures.length) {
            // If no failures, convert record array to CSV
            this.csvOutput = this.writeCsv(records);
          }
        });
    }
  }

  handleFileField () {
    this.csvFile ? this.setState({fileWarning: false}) : this.setState({fileWarning: true});
    console.log(this.csvFile)
  }


  handleVerifyClick () {
    // this.handleFileField();
    if (this.csvFile) { 
      this.parseCsv();
    } else {
      console.log('please upload CSV file')
    }
  }

  getFile (event) {
    // Store file reference
    this.csvFile = event.target.files[0];
    this.setState({
      formFile: this.csvFile.name,
      status: 'initial',
      metadata: {},
      errors: [],
      fileWarning: false
    });
  }

  componentDidMount () {
    console.log('hello')
  }
  render () {
    const errors = this.state.errors;
    let errorText = '';
    errors.forEach((error) => {
      errorText += `${error}\n`;
    });
    const errorMsg = errors.length
      ? <div className='form__group'>
          <p className='error'><b>{errors.length}</b> errors found in {this.csvFile.name}</p>
          <textarea className='form__control' id='form-textarea' rows='7' defaultValue={errorText}></textarea>
        </div>
      : '';
      
    return (
      <div className='page page--homepage'>
        <Header>
          <h1 className='page__title'>OpenAQ Upload Tool</h1>
          <p>Find a station and complete its metadata</p>
        </Header>
        <main role='main'>
          <fieldset className='form__fieldset'>
            <div className='form__group form__group--upload'>
              <label className='form__label' htmlFor='file-input'>Upload data</label>
              <p>We only accept text/csv files at this time.</p>
              <input type='file' className='form__control--upload' id='form-file' ref='file' accept='text/plain' onChange={(e) => this.getFile(e)} />
              <div className='form__input-group'>
                <span className='form__input-group-button'>
                  <button type='submit' className='button button--base button--text-hidden button--medium button--arrow-up-icon' onClick={() => this.refs.file.click()}></button>
                </span>
                <input type='text' readOnly className={`form__control form__control--medium ${this.state.fileWarning ? ' error' : ''}`} value={this.state.formFile} onChange={((e) => this.handleFileField(e).bind(this))} />
              </div>
              <label className={`form__label form__label-warning ${this.state.fileWarning ? ' error' : ''}`} htmlFor='file-input'>You must choose a file.</label>
            </div>
            {errorMsg}
            <button className='button button--primary button--verify' type='button' onClick={this.handleVerifyClick.bind(this)}>
              <span>Verify</span>
            </button>
          </fieldset>
        </main>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
  };
};

const mapDispatchToProps = {
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Home);
