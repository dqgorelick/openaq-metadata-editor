import React from 'react';
import { connect } from 'react-redux';

import measurementSchema from './measurement-schema.json';
import uploadSchema from './upload-schema.json';

import validator from 'jsonschema';
import fileReaderStream from 'filereader-stream';

import csv from 'csv-parser'

import Header from '../components/header';

class Home extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      /*
        menuStates:
        0 = Upload form
        1 = Status 
      */
      menuState: 0,
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
      'date/utc', 'date/local', 'mobile', 'location', 'city', 'country'
    ];
    let failures = [];
    required.forEach((prop) => {
      if (!(prop in header)) failures.push(`Dataset is missing "${prop}" column.`);
    });
    console.log(header)
    return failures;
  }

  writeCsv (records) {
    const header = Object.keys(records[0]);
    let csv = records.map(row => header.map(fieldName => JSON.stringify(row[fieldName])).join(','));
    csv.unshift(header.join(','));
    return csv.join('\r\n');
  }

  parseCsv () {
    if (this.csvFile) {
      // const csvStream = csv.createStream();
      console.log(this.csvFile)
      let records = [];
      let metadata = {};
      let failures = [];
      let line = 0;

      console.log(csv)

      fileReaderStream(this.csvFile).pipe(csv())
        .on('error', (failure) => {
          failures.push(failure);
        })
        .on('data', (data) => {
          console.log(JSON.stringify(data))
          // Check for data;
          if (!data || data === {}) {
            failures = ['No data provided'];
            this.setErrorState(failures);
          }
          if (line === 0 && !failures.length) {
            // Check header on first line
            failures = failures.concat(this.checkHeader(data));
            if (failures.length) {
              this.setErrorState(failures);
            }
          }

          let record = {};
          Object.keys(data).forEach((key) => {
            let value = data[key];
            if (!isNaN(value)) {
              value = Number(value);
            }
            record[key] = value
          })

          console.log(record)

          let v = validator.validate(record, uploadSchema);
          v.errors.forEach((e) => {
            console.log(e)
            failures.push(`Record ${line}: ${e.property.replace('instance.', '')} (${e.instance}) ${e.message}`);
          });

          line++;


          // Parse CSV
          // if (!failures.length) {
          //   let record = {};
          //   Object.keys(data).forEach((key) => {
          //     let value = data[key];
          //     // Numeric strings should be converted to numbers
          //     if (!isNaN(value)) {
          //       value = Number(value);
          //     }
          //     // Sub-keys will be indicated by a slash
          //     const splitKey = key.split('/');
          //     // Treat values attached to primary keys differently than those with subkeys
          //     if (splitKey.length === 1) {
          //       // The "mobile" attribute should be converted to boolean
          //       if (key === 'mobile' && isNaN(value)) {
          //         if (value.toLowerCase() === 'true') {
          //           value = true;
          //         } else if (value.toLowerCase() === 'false') {
          //           value = false;
          //         }
          //       }
          //       // Save value to record
          //       record[key] = value;
          //     // Treat values attached to subkeys differently than those attached to primary keys
          //     } else {
          //       const [key, subkey] = splitKey;
          //       // Treat attribution differently, as it is an array of name/url pairs
          //       if (key === 'attribution') {
          //         if (subkey === 'name' && isNaN(value)) {
          //           // Attribution arrays will be separated by a space-padded pipe character (|) in the csv.
          //           // URL order and number must match name order and number (if a URL isn't paired
          //           // with a name, the user will still need to provide a separator to skip it).
          //           // This is hard to represent in csv; we may be able to find a better way.
          //           const urls = data['attribution/url'].split('|');
          //           value = value.split('|').map((name, i) => {
          //             const url = urls[i];
          //             if (url.length) {
          //               return {name: name, url: url};
          //             }
          //             return {name: name};
          //           });
          //           record[key] = value;
          //         }
          //       } else {
          //         // Add subkeys, if applicable
          //         if (key === 'date' && !record['date']) record['date'] = {};
          //         if (key === 'averagingPeriod' && !record['averagingPeriod']) record['averagingPeriod'] = {};
          //         if (key === 'coordinates' && !record['coordinates']) record['coordinates'] = {};
          //         // Dates are not a valid JSON type, so enforcing a particular format would be subjective.
          //         // We may change the schema to a regex string validator.
          //         if (key === 'date' && subkey === 'utc' && isNaN(value)) {
          //           value = new Date(value);
          //         }
          //         // Save value to record
          //         record[key][subkey] = value;
          //       }
          //     }
          //   });

          //   // Perform validation of the compiled object against the JSON schema file
          //   console.log('validating', record)
          //   let v = validator.validate(record, measurementSchema);
          //   v.errors.forEach((e) => {
          //     failures.push(`Record ${line}: ${e.stack}`);
          //   });
          //   if (line === 0) {
          //     // Initialize metadata object on first line
          //     metadata.location = [];
          //     metadata.city = [];
          //     metadata.country = [];
          //     metadata.dates = {};
          //     metadata.values = {};
          //   }
          //   // Add array information to metadata
          //   metadata.location.push(record.location);
          //   metadata.city.push(record.city);
          //   metadata.country.push(record.country);
          //   metadata.dates[record.date.local] = true;
          //   metadata.values[record.parameter] = true;

          //   console.log(record) 
          //   // Add record to array
          //   line++;
          // }
        })
        .on('end', () => {
          metadata.measurements = line;
          console.log(line)
          console.log(failures)
          this.setErrorState(failures, metadata);
          if (!failures.length) {
            // If no failures, convert record array to CSV
            // this.csvOutput = this.writeCsv(records);
          }
          this.setState({menuState: 1})
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
          <p className='error'><b>{`${errors.length} error${errors.length === 1 ? '' : 's'} `}</b>found.</p>
          <textarea readOnly className='form__control' id='form-textarea' rows='7' defaultValue={errorText}></textarea>
        </div>
      : '';
      
    return (
      <div className='page page--homepage'>
        <Header>
          <div className='header-wrapper'>
            <h1 className='page__title'>OpenAQ Upload Tool</h1>
            <p>Have data to contribute to the platform? Apply for an account to share your government-level or research-grade data with the world.</p>
            <p>Apply for an account or Test your data below</p>
          </div>
        </Header>
        <main role='main'>
          <div className="inner">
            {
              this.state.menuState === 0 ?
              <section className="section-wrapper">
                <h2>Validate your data</h2>
                <p>Guide for formatting your data <a>here</a>. Download a template CSV <a>here</a>. We only accept csv files at this time.</p>
                <fieldset className='form__fieldset'>
                  <div className='form__group form__group--upload'>
                      <input type='file' className='form__control--upload' id='form-file' ref='file' accept='text/plain' onChange={(e) => this.getFile(e)} />
                      <div className='form__input-group'>
                        <span className='form__input-group-button'>
                          <button type='submit' className='button button--base button--text-hidden button--medium button--arrow-up-icon' onClick={() => this.refs.file.click()}></button>
                        </span>
                        <input type='text' readOnly className={`form__control form__control--medium ${this.state.fileWarning ? ' error' : ''}`} value={this.state.formFile} onChange={((e) => this.handleFileField(e).bind(this))} />
                      </div>
                  </div>
                  <p>Verifying your data will all be performed in the browser – data will not be uploaded in this step.</p>
                  <button className='button button--primary button--verify' type='button' onClick={this.handleVerifyClick.bind(this)}>
                    <span>Verify</span>
                  </button>
                </fieldset>
              </section>
              : this.state.menuState === 1 ?
              <section className="section-wrapper">
                <h2>Validate your data</h2>
                {
                  this.state.errors.length > 0 ?
                  <div className="upload-status upload-status-error">
                      <h5>Status: Some changes necessary</h5>
                      <p>Please review notes below. After reformatting your data, you can check the formatting again. </p>
                      <p>Guide for formatting your data <a>here</a> and you can download a template CSV <a>here</a>.</p>
                  </div> 
                  : 
                  <div className="upload-status upload-status-success">
                      <h5>Status: Data formatted correctly!</h5>
                      <p>You can review your data below to make changes, or you can continue uploading your data.</p>
                      <p><strong>Note:</strong> you will need to <a>apply for an account</a> to upload data</p>
                  </div> 
                }
                <p>File processed: <strong>{this.csvFile.name}</strong></p>
                <fieldset className='form__fieldset'>
                {
                  this.state.errors.length > 0 ?
                  <div>
                    <p>Notes:</p>
                    {errorMsg}
                  </div>
                  :
                  <div></div>
                }
                  <button className='button button--primary button--verify' type='button' onClick={()=>{this.setState({menuState: 0})}}>
                    <span>Update file</span>
                  </button>
                </fieldset>
              </section>
              : <div></div>

            }
          </div>
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
